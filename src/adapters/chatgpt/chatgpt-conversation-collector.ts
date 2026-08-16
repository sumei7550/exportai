export interface ChatGPTScrollState {
  top: number;
  max: number;
  viewport: number;
}

export interface ChatGPTScrollDriver {
  findContainer(document: Document): HTMLElement | null;
  readState(container: HTMLElement): ChatGPTScrollState;
  scrollTo(container: HTMLElement, top: number): void;
  waitForDomUpdate(document: Document): Promise<boolean>;
}

export interface ChatGPTCollectionOptions {
  driver?: ChatGPTScrollDriver;
  maxScrollSteps?: number;
  maxTopAttempts?: number;
}

export interface ChatGPTCollectionOutcome {
  complete: boolean;
  reason?: string;
}

const POSITION_TOLERANCE = 2;
const DEFAULT_MAX_SCROLL_STEPS = 400;
const DEFAULT_MAX_TOP_ATTEMPTS = 20;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalizedState(container: HTMLElement): ChatGPTScrollState {
  const viewport = Math.max(0, container.clientHeight);
  const max = Math.max(0, container.scrollHeight - viewport);
  return {
    top: clamp(container.scrollTop, 0, max),
    max,
    viewport,
  };
}

function findDefaultScrollContainer(document: Document): HTMLElement | null {
  const root = document.querySelector("main");
  const candidates: HTMLElement[] = [];
  let current: Element | null = root;
  while (current) {
    if (current instanceof HTMLElement) candidates.push(current);
    current = current.parentElement;
  }

  const view = document.defaultView;
  const styledScrollable = candidates.find((candidate) => {
    const overflowY = view?.getComputedStyle(candidate).overflowY ?? "";
    return /^(auto|scroll|overlay)$/.test(overflowY)
      && candidate.scrollHeight - candidate.clientHeight > POSITION_TOLERANCE;
  });
  if (styledScrollable) return styledScrollable;

  const documentScroller = document.scrollingElement;
  if (documentScroller instanceof HTMLElement
    && documentScroller.scrollHeight - documentScroller.clientHeight > POSITION_TOLERANCE) {
    return documentScroller;
  }
  return null;
}

function defaultScrollTo(container: HTMLElement, top: number): void {
  container.scrollTop = top;
  container.dispatchEvent(new Event("scroll"));
}

function waitForQuietDom(document: Document): Promise<boolean> {
  const view = document.defaultView;
  const target = document.querySelector("main") ?? document.body;
  if (!view || !target) return Promise.resolve(false);

  return new Promise((resolve) => {
    let finished = false;
    let quietTimer: number | undefined;
    const finish = (settled: boolean): void => {
      if (finished) return;
      finished = true;
      observer.disconnect();
      if (quietTimer !== undefined) view.clearTimeout(quietTimer);
      view.clearTimeout(timeoutTimer);
      resolve(settled);
    };
    const scheduleQuiet = (): void => {
      if (quietTimer !== undefined) view.clearTimeout(quietTimer);
      quietTimer = view.setTimeout(() => finish(true), 100);
    };
    const observer = new MutationObserver(scheduleQuiet);
    const timeoutTimer = view.setTimeout(() => finish(false), 1_000);
    observer.observe(target, { childList: true, subtree: true, characterData: true });
    view.requestAnimationFrame(() => view.requestAnimationFrame(scheduleQuiet));
  });
}

export const DEFAULT_CHATGPT_SCROLL_DRIVER: ChatGPTScrollDriver = {
  findContainer: findDefaultScrollContainer,
  readState: normalizedState,
  scrollTo: defaultScrollTo,
  waitForDomUpdate: waitForQuietDom,
};

function incomplete(reason: string): ChatGPTCollectionOutcome {
  return { complete: false, reason };
}

export function hasScrollableChatGPTConversation(
  document: Document,
  driver: ChatGPTScrollDriver = DEFAULT_CHATGPT_SCROLL_DRIVER,
): boolean {
  try {
    const container = driver.findContainer(document);
    return container !== null && driver.readState(container).max > POSITION_TOLERANCE;
  } catch {
    return true;
  }
}

export async function collectChatGPTConversationWindows(
  document: Document,
  captureWindow: () => string,
  options: ChatGPTCollectionOptions = {},
): Promise<ChatGPTCollectionOutcome> {
  const driver = options.driver ?? DEFAULT_CHATGPT_SCROLL_DRIVER;
  const maxScrollSteps = options.maxScrollSteps ?? DEFAULT_MAX_SCROLL_STEPS;
  const maxTopAttempts = options.maxTopAttempts ?? DEFAULT_MAX_TOP_ATTEMPTS;
  captureWindow();

  let container: HTMLElement | null;
  let initialState: ChatGPTScrollState;
  try {
    container = driver.findContainer(document);
    if (!container) return { complete: true };
    initialState = driver.readState(container);
  } catch {
    return incomplete("The ChatGPT scroll container could not be read safely.");
  }

  if (initialState.max <= POSITION_TOLERANCE) return { complete: true };

  const originalBottomOffset = Math.max(0, initialState.max - initialState.top);
  let outcome: ChatGPTCollectionOutcome = { complete: true };

  try {
    let previousTopSignature: string | null = null;
    let previousTopMax = -1;
    let reachedStableTop = false;

    for (let attempt = 0; attempt < maxTopAttempts; attempt += 1) {
      driver.scrollTo(container, 0);
      if (!(await driver.waitForDomUpdate(document))) {
        outcome = incomplete("The ChatGPT message window did not settle while loading conversation history.");
      }
      const signature = captureWindow();
      const state = driver.readState(container);
      const isStable = state.top <= POSITION_TOLERANCE
        && signature === previousTopSignature
        && Math.abs(state.max - previousTopMax) <= POSITION_TOLERANCE;
      if (isStable) {
        reachedStableTop = true;
        break;
      }
      previousTopSignature = signature;
      previousTopMax = state.max;
    }

    if (!reachedStableTop) {
      outcome = incomplete("The beginning of the ChatGPT conversation could not be confirmed.");
    }

    let reachedBottom = false;
    for (let step = 0; step < maxScrollSteps; step += 1) {
      const before = driver.readState(container);
      if (before.max - before.top <= POSITION_TOLERANCE) {
        reachedBottom = true;
        break;
      }

      const distance = Math.max(160, before.viewport * 0.8);
      const nextTop = Math.min(before.max, before.top + distance);
      driver.scrollTo(container, nextTop);
      if (!(await driver.waitForDomUpdate(document))) {
        outcome = incomplete("The ChatGPT message window did not settle while collecting the conversation.");
      }
      captureWindow();

      const after = driver.readState(container);
      if (after.max - after.top <= POSITION_TOLERANCE) {
        reachedBottom = true;
        break;
      }
      if (after.top <= before.top + POSITION_TOLERANCE) {
        outcome = incomplete("ChatGPT stopped scrolling before the end of the conversation was reached.");
        break;
      }
    }

    if (!reachedBottom) {
      outcome = incomplete("The end of the ChatGPT conversation could not be confirmed within the collection limit.");
    } else {
      if (!(await driver.waitForDomUpdate(document))) {
        outcome = incomplete("The final ChatGPT message window did not settle.");
      }
      captureWindow();
    }
  } catch {
    outcome = incomplete("ChatGPT conversation collection was interrupted before all message windows were read.");
  } finally {
    try {
      const current = driver.readState(container);
      const restoreTop = clamp(current.max - originalBottomOffset, 0, current.max);
      driver.scrollTo(container, restoreTop);
      await driver.waitForDomUpdate(document);
      const restored = driver.readState(container);
      if (Math.abs(restored.top - restoreTop) > POSITION_TOLERANCE) {
        outcome = incomplete("The conversation was collected, but the original ChatGPT scroll position could not be restored.");
      }
    } catch {
      outcome = incomplete("The conversation was collected, but the original ChatGPT scroll position could not be restored.");
    }
  }

  return outcome;
}
