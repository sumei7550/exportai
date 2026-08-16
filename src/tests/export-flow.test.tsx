// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExportFlowModal, type ExportFlowState } from "../popup/export-flow";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  vi.useRealTimers();
});

function renderFlow(state: ExportFlowState, onClose = vi.fn()) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<ExportFlowModal state={state} onClose={onClose} />));
  return { container, onClose };
}

describe("shared export flow modal", () => {
  beforeEach(() => vi.useFakeTimers());

  it("shows Processing and rotates each status message every three seconds", () => {
    const { container } = renderFlow({ status: "processing", format: "Markdown" });
    expect(container.textContent).toContain("Processing, Please wait...");
    expect(container.textContent).toContain("Working on it...");

    act(() => vi.advanceTimersByTime(3000));
    expect(container.textContent).toContain("Longer chats may take a bit more time...");
    act(() => vi.advanceTimersByTime(12000));
    expect(container.textContent).toContain("Working on it...");
  });

  it("shows success until X or outside click closes it", () => {
    const { container, onClose } = renderFlow({ status: "success", format: "JSON", filename: "conversation.json" });
    expect(container.textContent).toContain("Export Success!");
    expect(container.textContent).toContain("conversation.json download started.");

    const closeButton = container.querySelector('button[aria-label="Close export message"]');
    act(() => closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onClose).toHaveBeenCalledOnce();

    act(() => container.querySelector('[role="dialog"]')?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("shows error and never renders success", () => {
    const { container } = renderFlow({ status: "error", format: "PDF", reason: "The PDF file could not be saved. Please try again." });
    expect(container.textContent).toContain("Export Failed");
    expect(container.textContent).toContain("The PDF file could not be saved. Please try again.");
    expect(container.textContent).not.toContain("Export Success!");
  });
});
