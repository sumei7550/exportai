// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const { saveJsonFile } = vi.hoisted(() => ({ saveJsonFile: vi.fn() }));
vi.mock("../exporters/json-download-service", () => ({ saveJsonFile }));

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

function findButton(container: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll("button")).find((element) => element.textContent === label);
}

describe("Popup JSON export UI", () => {
  it("shows an enabled JSON export button after conversation parsing", async () => {
    installSuccessfulConversation();
    const container = await renderPopup();
    const button = findButton(container, "Export JSON");

    expect(button).toBeDefined();
    expect(button?.disabled).toBe(false);
    expect(findButton(container, "Export Markdown")).toBeDefined();
  });

  it("runs the complete JSON action and reports only that download started", async () => {
    installSuccessfulConversation();
    saveJsonFile.mockResolvedValue(undefined);
    const container = await renderPopup();

    await act(async () => {
      findButton(container, "Export JSON")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(saveJsonFile).toHaveBeenCalledOnce();
    const request = saveJsonFile.mock.calls[0]?.[0] as { json: string; filename: string };
    expect(request.filename).toBe("ExportAI fixture.json");
    expect(JSON.parse(request.json).schemaVersion).toBe("1.0");
    expect(container.querySelector('[role="status"]')?.textContent).toBe("JSON download started: ExportAI fixture.json");
    expect(container.textContent).not.toContain("Saved successfully");
  });

  it("shows a safe failure state when the download service fails", async () => {
    installSuccessfulConversation();
    saveJsonFile.mockRejectedValue(new Error("private disk path"));
    const container = await renderPopup();

    await act(async () => {
      findButton(container, "Export JSON")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toBe("The JSON file could not be saved. Please try again.");
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.textContent).not.toContain("private disk path");
  });

  it("does not invoke the download service or show success for invalid data", async () => {
    const conversation = createConversationFixture();
    conversation.metadata.messageCount += 1;
    installSuccessfulConversation(conversation);
    const container = await renderPopup();

    await act(async () => {
      findButton(container, "Export JSON")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(saveJsonFile).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("This conversation contains invalid data and could not be exported.");
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
