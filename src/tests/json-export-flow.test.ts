// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { saveJsonFile } from "../exporters/json-download-service";
import { exportConversationToJson } from "../exporters/json-exporter";
import { exportJsonFromPopup } from "../popup/json-export-action";
import type { Message } from "../types/conversation";
import { createConversationFixture } from "./fixtures/conversation.fixture";

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(blob, "UTF-8");
  });
}

describe("JSON export flow", () => {
  it("passes the exact exporter JSON and filename to the download service", async () => {
    const conversation = createConversationFixture();
    const coreResult = exportConversationToJson(conversation);
    if (coreResult.status === "error") throw new Error(coreResult.code);
    const save = vi.fn().mockResolvedValue(undefined);

    await expect(exportJsonFromPopup(conversation, save)).resolves.toEqual({
      status: "success",
      filename: "ExportAI fixture.json",
    });
    expect(save).toHaveBeenCalledWith({ json: coreResult.json, filename: coreResult.filename });
  });

  it("creates an unchanged UTF-8 JSON Blob and completes the anchor lifecycle", async () => {
    const json = '{\n  "schemaVersion": "1.0",\n  "title": "导出 🚀"\n}\n';
    const createObjectURL = vi.fn((_blob: Blob) => "blob:exportai-json-test");
    const revokeObjectURL = vi.fn();
    let clickedHref = "";
    let clickedFilename = "";
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clickedHref = this.href;
      clickedFilename = this.download;
    });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    await saveJsonFile({ json, filename: "导出 🚀.json" });

    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/json;charset=utf-8");
    await expect(readBlobAsText(blob)).resolves.toBe(json);
    expect(clickedHref).toBe("blob:exportai-json-test");
    expect(clickedFilename).toBe("导出 🚀.json");
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download="导出 🚀.json"]')).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:exportai-json-test");

  });

  it("does not download an empty conversation", async () => {
    const conversation = createConversationFixture();
    conversation.messages = [];
    conversation.metadata.messageCount = 0;
    const save = vi.fn().mockResolvedValue(undefined);

    await expect(exportJsonFromPopup(conversation, save)).resolves.toEqual({
      status: "error",
      reason: "This conversation has no messages to export.",
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("does not download an invalid conversation", async () => {
    const conversation = createConversationFixture();
    conversation.metadata.messageCount += 1;
    const save = vi.fn().mockResolvedValue(undefined);

    await expect(exportJsonFromPopup(conversation, save)).resolves.toEqual({
      status: "error",
      reason: "This conversation contains invalid data and could not be exported.",
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("does not download partial JSON after serialization failure", async () => {
    const conversation = createConversationFixture();
    const codeBlock = conversation.messages[1].blocks.find((block) => block.type === "code");
    if (codeBlock === undefined || codeBlock.type !== "code") throw new Error("Code fixture is missing");
    let reads = 0;
    Object.defineProperty(codeBlock, "code", {
      configurable: true,
      get: () => reads++ === 0 ? "valid during validation" : BigInt(1),
    });
    const save = vi.fn().mockResolvedValue(undefined);

    await expect(exportJsonFromPopup(conversation, save)).resolves.toEqual({
      status: "error",
      reason: "The JSON file could not be generated. Please try again.",
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("returns a safe failure state when local saving fails", async () => {
    const conversation = createConversationFixture();
    conversation.messages[0].originalText = "private conversation body";
    const save = vi.fn().mockRejectedValue(new Error("C:\\private\\disk failure"));

    const result = await exportJsonFromPopup(conversation, save);

    expect(result).toEqual({ status: "error", reason: "The JSON file could not be saved. Please try again." });
    expect(JSON.stringify(result)).not.toContain("private conversation body");
    expect(JSON.stringify(result)).not.toContain("C:\\private");
  });

  it("reports SAVE_FAILED and cleans resources when the anchor click fails", async () => {
    const createObjectURL = vi.fn((_blob: Blob) => "blob:exportai-click-failure");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("browser blocked download");
    });

    await expect(exportJsonFromPopup(createConversationFixture(), saveJsonFile)).resolves.toEqual({
      status: "error",
      reason: "The JSON file could not be saved. Please try again.",
    });
    expect(document.querySelector("a[download]")).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:exportai-click-failure");
  });

  it("exports all 500 messages through the integrated download action", async () => {
    const conversation = createConversationFixture();
    conversation.messages = Array.from({ length: 500 }, (_, index): Message => ({
      id: `message-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      order: index,
      originalText: `Message ${index}`,
      blocks: [{ id: `block-${index}`, type: "paragraph", content: [{ text: `Message ${index}` }] }],
      metadata: {},
    }));
    conversation.metadata.messageCount = 500;
    const save = vi.fn().mockResolvedValue(undefined);

    await expect(exportJsonFromPopup(conversation, save)).resolves.toMatchObject({ status: "success" });
    const request = save.mock.calls[0]?.[0] as { json: string; filename: string };
    const document = JSON.parse(request.json) as { messages: Array<{ id: string; order: number }> };
    expect(request.filename).toBe("ExportAI fixture.json");
    expect(document.messages).toHaveLength(500);
    expect(document.messages[0]).toMatchObject({ id: "message-0", order: 0 });
    expect(document.messages[499]).toMatchObject({ id: "message-499", order: 499 });
    expect(new Set(document.messages.map((message) => message.id)).size).toBe(500);
  });
});
