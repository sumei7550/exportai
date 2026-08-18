import { detectPlatformFromHostname } from "../../constants/platforms";
import { normalizeConversation } from "../../parser/conversation-normalizer";
import {
  CONVERSATION_MODEL_VERSION,
  type Block,
  type Conversation,
  type Message,
  type MessageRole,
  type ParseWarning,
} from "../../types/conversation";
import type { AdapterParseResult, PageLocation, PlatformAdapter } from "../types";
import { parseChatGPTBlocks, safeChatGPTMessageText, type BlockParseContext } from "./chatgpt-block-parser";
import {
  collectChatGPTConversationWindows,
  hasScrollableChatGPTConversation,
  type ChatGPTCollectionOptions,
} from "./chatgpt-conversation-collector";
import { CHATGPT_DOM } from "./chatgpt-selectors";
import { safeTextContent, stableDomId } from "./dom-utils";

type BlockParser = (container: Element, context: BlockParseContext) => Block[];

export interface ChatGPTAdapterDependencies {
  parseBlocks?: BlockParser;
  now?: () => Date;
  collection?: ChatGPTCollectionOptions;
}

interface MessageIdentity {
  aliases: string[];
  seed: string;
  stable: boolean;
  turnOrder?: number;
}

interface CapturedMessage {
  identity: MessageIdentity;
  message: Message;
}

interface CachedMessage {
  aliases: Set<string>;
  firstSeen: number;
  message: Message;
  stable: boolean;
  turnOrder?: number;
}

interface MessageCache {
  records: Set<CachedMessage>;
  aliases: Map<string, CachedMessage>;
  edges: Map<CachedMessage, Set<CachedMessage>>;
  nextSeen: number;
  identityConflict: boolean;
}

interface OrderedMessages {
  messages: Message[];
  complete: boolean;
  reason?: string;
}

function documentOrder(left: Element, right: Element): number {
  if (left === right) return 0;
  const position = left.compareDocumentPosition(right);
  return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

function outermost(elements: Element[]): Element[] {
  return elements.filter((candidate) => !elements.some((other) => other !== candidate && other.contains(candidate)));
}

function findConversationRoot(document: Document): Element {
  for (const selector of CHATGPT_DOM.conversationRoots) {
    const root = document.querySelector(selector);
    if (root) return root;
  }
  return document.body ?? document.documentElement;
}

function findMessageNodes(document: Document): Element[] {
  const root = findConversationRoot(document);
  const primary = outermost([...root.querySelectorAll(CHATGPT_DOM.primaryMessages)]);
  const fallback = [...root.querySelectorAll(CHATGPT_DOM.fallbackMessages)]
    .filter((candidate) => !primary.some((message) => candidate.contains(message) || message.contains(candidate)));
  return [...primary, ...fallback].sort(documentOrder);
}

function roleContainer(messageNode: Element): Element {
  if (messageNode.hasAttribute(CHATGPT_DOM.roleAttribute)) return messageNode;
  return messageNode.querySelector(CHATGPT_DOM.roleContainers) ?? messageNode;
}

function parseRole(messageNode: Element): MessageRole {
  const value = (
    messageNode.getAttribute(CHATGPT_DOM.turnRoleAttribute)
    ?? roleContainer(messageNode).getAttribute(CHATGPT_DOM.roleAttribute)
  )?.toLowerCase();
  if (value === "user" || value === "assistant" || value === "system") return value;
  const testId = messageNode.getAttribute("data-testid")?.toLowerCase() ?? "";
  if (testId.includes("user")) return "user";
  if (testId.includes("assistant")) return "assistant";
  return "unknown";
}

function attributeFromMessage(messageNode: Element, attribute: string): string | null {
  const container = roleContainer(messageNode);
  const value = messageNode.getAttribute(attribute) ?? container.getAttribute(attribute);
  return value?.trim() || null;
}

function conversationTurn(messageNode: Element): { id: string; order?: number } | null {
  const candidates = [messageNode, roleContainer(messageNode), messageNode.closest(CHATGPT_DOM.primaryMessages)]
    .filter((candidate): candidate is Element => candidate !== null);
  for (const candidate of candidates) {
    for (const attribute of CHATGPT_DOM.conversationTurnAttributes) {
      const value = candidate.getAttribute(attribute)?.trim();
      if (!value) continue;
      const match = value.match(CHATGPT_DOM.conversationTurnPattern);
      if (match) return { id: value, order: Number(match[1]) };
    }
  }
  return null;
}

function messageIdentity(messageNode: Element, role: MessageRole): MessageIdentity {
  const dataMessageId = attributeFromMessage(messageNode, CHATGPT_DOM.messageIdAttribute);
  const turn = conversationTurn(messageNode);
  const aliases = [
    dataMessageId ? `message:${dataMessageId}` : null,
    turn ? `turn:${turn.id}` : null,
  ].filter((value): value is string => value !== null);
  if (aliases.length > 0) {
    return { aliases, seed: aliases[0], stable: true, turnOrder: turn?.order };
  }

  const text = safeChatGPTMessageText(roleContainer(messageNode));
  return {
    aliases: [`content:${role}:${text}`],
    seed: `content:${role}:${text}`,
    stable: false,
  };
}

function createMessageId(identity: MessageIdentity): string {
  return stableDomId("chatgpt-message", identity.seed);
}

function sourceAttributes(messageNode: Element): Record<string, string> | undefined {
  const attributes: Record<string, string> = {};
  const container = roleContainer(messageNode);
  const messageId = attributeFromMessage(messageNode, CHATGPT_DOM.messageIdAttribute);
  if (messageId) attributes[CHATGPT_DOM.messageIdAttribute] = messageId;
  const turn = conversationTurn(messageNode);
  if (turn) attributes["conversation-turn-id"] = turn.id;
  const role = container.getAttribute(CHATGPT_DOM.roleAttribute);
  if (role) attributes[CHATGPT_DOM.roleAttribute] = role;
  const turnRole = messageNode.getAttribute(CHATGPT_DOM.turnRoleAttribute);
  if (turnRole) attributes[CHATGPT_DOM.turnRoleAttribute] = turnRole;
  return Object.keys(attributes).length > 0 ? attributes : undefined;
}

function rawConversationId(pathname: string): string | null {
  return pathname.match(/\/c\/([^/?#]+)/)?.[1] ?? null;
}

function extractConversationId(location: PageLocation): string {
  const match = location.pathname.match(/\/c\/([^/?#]+)/);
  return stableDomId("chatgpt-conversation", match?.[1] ?? location.pathname);
}

function cleanDocumentTitle(value: string): string {
  return value.replace(/\s*[|–—-]\s*ChatGPT\s*$/i, "").trim();
}

function extractTitle(document: Document, location: PageLocation): string {
  const currentConversationId = rawConversationId(location.pathname);
  for (const selector of CHATGPT_DOM.titleLinks) {
    const links = [...document.querySelectorAll<HTMLAnchorElement>(selector)];
    const current = links.find((link) => {
      try {
        const pathname = new URL(link.href, location.href).pathname;
        return pathname === location.pathname
          || (currentConversationId !== null && rawConversationId(pathname) === currentConversationId);
      } catch {
        return false;
      }
    });
    const title = current ? safeTextContent(current) : "";
    if (title) return title;
  }
  const documentTitle = cleanDocumentTitle(document.title);
  return /^chatgpt$/i.test(documentTitle) || !documentTitle ? "Untitled conversation" : documentTitle;
}

function fallbackMessage(messageNode: Element, id: string, role: MessageRole): Message {
  const originalText = safeChatGPTMessageText(roleContainer(messageNode));
  return {
    id,
    role,
    order: 0,
    originalText,
    blocks: originalText ? [{ id: `${id}-fallback`, type: "unknown", rawText: originalText, sourceTag: messageNode.tagName.toLowerCase() }] : [],
    metadata: { isPartial: true, sourceAttributes: sourceAttributes(messageNode) },
  };
}

function warningKey(warning: ParseWarning): string {
  return `${warning.code}\u0000${warning.messageId ?? ""}\u0000${warning.message}`;
}

function addWarning(warnings: ParseWarning[], warning: ParseWarning): void {
  const key = warningKey(warning);
  if (!warnings.some((candidate) => warningKey(candidate) === key)) warnings.push(warning);
}

function messageQuality(message: Message): number {
  return (message.metadata.isPartial === true ? 0 : 1_000_000)
    + message.blocks.length * 1_000
    + message.originalText.length;
}

function createMessageCache(): MessageCache {
  return {
    records: new Set(),
    aliases: new Map(),
    edges: new Map(),
    nextSeen: 0,
    identityConflict: false,
  };
}

function mergeCapturedMessage(cache: MessageCache, captured: CapturedMessage): CachedMessage {
  const matches = new Set(
    captured.identity.aliases
      .map((alias) => cache.aliases.get(alias))
      .filter((record): record is CachedMessage => record !== undefined),
  );
  let record = matches.values().next().value as CachedMessage | undefined;
  if (!record) {
    record = {
      aliases: new Set(),
      firstSeen: cache.nextSeen,
      message: captured.message,
      stable: captured.identity.stable,
      turnOrder: captured.identity.turnOrder,
    };
    cache.nextSeen += 1;
    cache.records.add(record);
  }

  if (matches.size > 1) cache.identityConflict = true;
  for (const alias of captured.identity.aliases) {
    record.aliases.add(alias);
    cache.aliases.set(alias, record);
  }
  record.stable = record.stable && captured.identity.stable;
  record.turnOrder ??= captured.identity.turnOrder;
  if (messageQuality(captured.message) >= messageQuality(record.message)) record.message = captured.message;
  return record;
}

function addWindowToCache(cache: MessageCache, captured: CapturedMessage[]): string {
  const records = captured.map((message) => mergeCapturedMessage(cache, message));
  for (let index = 1; index < records.length; index += 1) {
    const previous = records[index - 1];
    const current = records[index];
    if (previous === current) continue;
    const successors = cache.edges.get(previous) ?? new Set<CachedMessage>();
    successors.add(current);
    cache.edges.set(previous, successors);
  }
  return records.map((record) => [...record.aliases].sort().join("|")).join(">");
}

function orderedCacheRecords(cache: MessageCache): { records: CachedMessage[]; cycle: boolean } {
  const records = [...cache.records];
  const indegree = new Map(records.map((record) => [record, 0]));
  for (const successors of cache.edges.values()) {
    for (const successor of successors) indegree.set(successor, (indegree.get(successor) ?? 0) + 1);
  }

  const compare = (left: CachedMessage, right: CachedMessage): number => {
    if (left.turnOrder !== undefined && right.turnOrder !== undefined && left.turnOrder !== right.turnOrder) {
      return left.turnOrder - right.turnOrder;
    }
    return left.firstSeen - right.firstSeen;
  };
  const available = records.filter((record) => indegree.get(record) === 0).sort(compare);
  const ordered: CachedMessage[] = [];
  while (available.length > 0) {
    const record = available.shift();
    if (!record) break;
    ordered.push(record);
    for (const successor of cache.edges.get(record) ?? []) {
      const nextIndegree = (indegree.get(successor) ?? 0) - 1;
      indegree.set(successor, nextIndegree);
      if (nextIndegree === 0) {
        available.push(successor);
        available.sort(compare);
      }
    }
  }
  if (ordered.length === records.length) return { records: ordered, cycle: false };
  return { records: records.sort(compare), cycle: true };
}

function finalizeMessageOrder(cache: MessageCache, requireFullTurnSequence: boolean): OrderedMessages {
  const ordered = orderedCacheRecords(cache);
  const messages = ordered.records.map((record, order) => ({ ...record.message, order }));
  if (cache.identityConflict) {
    return { messages, complete: false, reason: "Conflicting ChatGPT message identities were detected while merging message windows." };
  }
  if (ordered.cycle) {
    return { messages, complete: false, reason: "Conflicting ChatGPT message order was detected while merging message windows." };
  }
  if (ordered.records.some((record) => !record.stable)) {
    return { messages, complete: false, reason: "At least one ChatGPT message had no stable message or conversation turn ID." };
  }

  if (requireFullTurnSequence) {
    const turnOrders = ordered.records
      .map((record) => record.turnOrder)
      .filter((value): value is number => value !== undefined)
      .sort((left, right) => left - right);
    if (turnOrders.length > 0) {
      const hasGap = turnOrders[0] !== 0
        || turnOrders.some((value, index) => index > 0 && value !== turnOrders[index - 1] + 1);
      if (hasGap) {
        return { messages, complete: false, reason: "One or more ChatGPT conversation turns were not discovered during scrolling." };
      }
    }
  }
  return { messages, complete: true };
}

export class ChatGPTAdapter implements PlatformAdapter {
  readonly platform = "chatgpt" as const;
  private readonly parseBlocks: BlockParser;
  private readonly now: () => Date;
  private readonly collection: ChatGPTCollectionOptions;

  constructor(dependencies: ChatGPTAdapterDependencies = {}) {
    this.parseBlocks = dependencies.parseBlocks ?? parseChatGPTBlocks;
    this.now = dependencies.now ?? (() => new Date());
    this.collection = dependencies.collection ?? {};
  }

  isSupportedPage(location: PageLocation): boolean {
    return detectPlatformFromHostname(location.hostname) === "chatgpt";
  }

  private captureWindow(document: Document, location: PageLocation, warnings: ParseWarning[]): CapturedMessage[] {
    return findMessageNodes(document).map((messageNode) => {
      const role = parseRole(messageNode);
      const identity = messageIdentity(messageNode, role);
      const id = createMessageId(identity);
      if (role === "unknown") {
        addWarning(warnings, { code: "chatgpt-message-role-unknown", message: "A message role could not be identified and was preserved as unknown.", messageId: id });
      }
      const container = roleContainer(messageNode);
      try {
        const messageWarnings: ParseWarning[] = [];
        const blocks = this.parseBlocks(container, { baseUrl: location.href, messageId: id, warnings: messageWarnings });
        messageWarnings.forEach((warning) => addWarning(warnings, warning));
        const originalText = safeChatGPTMessageText(container);
        if (blocks.length === 0) {
          addWarning(warnings, { code: "chatgpt-message-empty-blocks", message: "A message had no structured blocks and was preserved by the normalizer.", messageId: id });
        }
        return {
          identity,
          message: {
            id,
            role,
            order: 0,
            originalText,
            blocks,
            metadata: { isPartial: blocks.length === 0 || undefined, sourceAttributes: sourceAttributes(messageNode) },
          },
        };
      } catch {
        addWarning(warnings, { code: "chatgpt-message-parse-failed", message: "One ChatGPT message could not be fully structured and was preserved as partial readable content.", messageId: id });
        return { identity, message: fallbackMessage(messageNode, id, role) };
      }
    });
  }

  private resultFromCache(
    document: Document,
    location: PageLocation,
    cache: MessageCache,
    warnings: ParseWarning[],
    collectionComplete: boolean,
    collectionReason?: string,
    requireFullTurnSequence = false,
  ): AdapterParseResult {
    if (cache.records.size === 0) {
      return { status: "empty", reason: "ChatGPT is supported, but no readable conversation was detected on this page." };
    }

    const title = extractTitle(document, location);
    if (title === "Untitled conversation") {
      addWarning(warnings, { code: "chatgpt-title-missing", message: "The conversation title was not available; a readable fallback title was used." });
    }
    const ordered = finalizeMessageOrder(cache, requireFullTurnSequence);
    if (!collectionComplete || !ordered.complete) {
      addWarning(warnings, {
        code: "chatgpt-conversation-incomplete",
        message: collectionReason ?? ordered.reason ?? "The complete ChatGPT conversation could not be confirmed.",
      });
    }

    const hasPartialMessage = ordered.messages.some((message) => message.metadata.isPartial === true);
    const conversation: Conversation = {
      id: extractConversationId(location),
      title,
      platform: "chatgpt",
      sourceUrl: location.href,
      exportedAt: this.now().toISOString(),
      messages: ordered.messages,
      metadata: {
        messageCount: ordered.messages.length,
        isComplete: warnings.length === 0 && !hasPartialMessage,
        parseWarnings: warnings,
        modelVersion: CONVERSATION_MODEL_VERSION,
      },
    };
    return { status: "success", conversation: normalizeConversation(conversation).conversation };
  }

  parse(document: Document, location: PageLocation): AdapterParseResult {
    if (!this.isSupportedPage(location)) return { status: "unsupported", reason: "The current page is not a supported ChatGPT host." };

    try {
      const warnings: ParseWarning[] = [];
      const cache = createMessageCache();
      addWindowToCache(cache, this.captureWindow(document, location, warnings));
      const isScrollable = hasScrollableChatGPTConversation(document, this.collection.driver);
      return this.resultFromCache(
        document,
        location,
        cache,
        warnings,
        !isScrollable,
        isScrollable ? "Only the currently mounted ChatGPT message window was read; full scrolling collection was not run." : undefined,
      );
    } catch {
      return { status: "error", reason: "The ChatGPT page structure could not be read safely." };
    }
  }

  async collect(document: Document, location: PageLocation): Promise<AdapterParseResult> {
    if (!this.isSupportedPage(location)) return { status: "unsupported", reason: "The current page is not a supported ChatGPT host." };

    try {
      const warnings: ParseWarning[] = [];
      const cache = createMessageCache();
      const outcome = await collectChatGPTConversationWindows(
        document,
        () => addWindowToCache(cache, this.captureWindow(document, location, warnings)),
        this.collection,
      );
      return this.resultFromCache(
        document,
        location,
        cache,
        warnings,
        outcome.complete,
        outcome.reason,
        true,
      );
    } catch {
      return { status: "error", reason: "The ChatGPT page structure could not be read safely." };
    }
  }
}
