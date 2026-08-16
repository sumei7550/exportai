// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const { exportPdfFromPopup } = vi.hoisted(() => ({ exportPdfFromPopup: vi.fn() }));
vi.mock("../popup/pdf-export-action", () => ({ exportPdfFromPopup }));

import { PopupApp } from "../popup/popup-app";
import { MESSAGE_TYPE } from "../shared/messages";
import { createConversationFixture } from "./fixtures/conversation.fixture";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
  }
  root = undefined;
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function installSuccessfulConversation() {
  const conversation = createConversationFixture();
  const sendMessage = vi.fn()
    .mockResolvedValueOnce({ type: MESSAGE_TYPE.pageStatus, payload: { platform: "chatgpt", pageUrl: conversation.sourceUrl } })
    .mockResolvedValueOnce({ type: MESSAGE_TYPE.conversationParsed, payload: { status: "success", conversation } });
  vi.stubGlobal("chrome", { tabs: { query: vi.fn().mockResolvedValue([{ id: 1 }]), sendMessage } });
}

async function renderPopup() {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<PopupApp />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return container;
}

describe("Popup PDF export UI", () => {
  it("shows generating state while the PDF action is pending", async () => {
    installSuccessfulConversation();
    let resolveAction: ((result: unknown) => void) | undefined;
    exportPdfFromPopup.mockImplementation(() => new Promise((resolve) => { resolveAction = resolve; }));
    const container = await renderPopup();
    const button = Array.from(container.querySelectorAll("button")).find((element) => element.textContent === "Export PDF");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const generatingButton = Array.from(container.querySelectorAll("button")).find((element) => element.textContent === "Generating PDF...");
    expect(generatingButton?.disabled).toBe(true);
    expect(exportPdfFromPopup).toHaveBeenCalledOnce();

    await act(async () => {
      resolveAction?.({
        status: "success",
        filename: "exportai.pdf",
        pdfBytes: new Uint8Array([1]),
        preview: { blob: new Blob(), objectUrl: "blob:preview", cleanup: vi.fn() },
      });
      await Promise.resolve();
    });

    expect(container.querySelector('[role="status"]')?.textContent).toBe("PDF preview ready: exportai.pdf");
  });
});
