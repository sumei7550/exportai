// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const { saveMarkdownFile } = vi.hoisted(() => ({ saveMarkdownFile: vi.fn() }));
vi.mock("../exporters/markdown-download-service", () => ({ saveMarkdownFile }));

import { PopupApp } from "../popup/popup-app";
import { MESSAGE_TYPE } from "../shared/messages";
import { createConversationFixture } from "./fixtures/conversation.fixture";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(async () => {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }
  root = undefined;
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function installSuccessfulConversation(conversation = createConversationFixture()) {
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

describe("Popup Markdown export UI", () => {
  it("shows a success status after the user exports Markdown", async () => {
    installSuccessfulConversation();
    saveMarkdownFile.mockResolvedValue(undefined);
    const container = await renderPopup();
    const button = Array.from(container.querySelectorAll("button")).find((element) => element.textContent === "Export Markdown");

    expect(button).toBeDefined();
    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.querySelector('[role="status"]')?.textContent).toContain("Markdown download started: ExportAI fixture.md");
  });

  it("shows an error status when local saving fails", async () => {
    installSuccessfulConversation();
    saveMarkdownFile.mockRejectedValue(new Error("disk failure"));
    const container = await renderPopup();
    const button = Array.from(container.querySelectorAll("button")).find((element) => element.textContent === "Export Markdown");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toBe("The Markdown file could not be saved. Please try again.");
  });
});