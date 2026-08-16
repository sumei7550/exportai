import { describe, expect, it } from "vitest";
import { createPdfDocumentPlan } from "../exporters/pdf-document";
import { exportConversationToPdf } from "../exporters/pdf-exporter";
import { createPdfFilename } from "../exporters/pdf-filename";
import { hasValidPdfSignature } from "../exporters/pdf-types";
import type { Conversation } from "../types/conversation";
import { createConversationFixture } from "./fixtures/conversation.fixture";

function createBasicConversationFixture(): Conversation {
  const fixture = createConversationFixture();
  return {
    ...fixture,
    title: "ExportAI PDF fixture",
    messages: [
      {
        id: "message-user-001",
        role: "user",
        order: 0,
        originalText: "Hello ExportAI",
        blocks: [{ id: "block-user-001", type: "paragraph", content: [{ text: "Hello ExportAI" }] }],
        metadata: {},
      },
      {
        id: "message-assistant-001",
        role: "assistant",
        order: 1,
        originalText: "你好，世界",
        blocks: [{ id: "block-assistant-001", type: "text", content: [{ text: "你好，世界" }] }],
        metadata: {},
      },
    ],
    metadata: { ...fixture.metadata, messageCount: 2 },
  };
}

describe("PDF Exporter Core", () => {
  it("exports a basic conversation with title, metadata, and paragraph/text content", () => {
    const conversation = createBasicConversationFixture();
    const result = exportConversationToPdf(conversation);

    expect(result).toMatchObject({
      status: "success",
      filename: "ExportAI PDF fixture.pdf",
      mimeType: "application/pdf",
    });
    if (result.status === "error") throw new Error(result.code);

    expect(result.data).toBeInstanceOf(Uint8Array);
    expect(result.data.length).toBeGreaterThan(0);
    expect(hasValidPdfSignature(result.data)).toBe(true);

    const plan = createPdfDocumentPlan(conversation);
    expect(plan.title).toBe("ExportAI PDF fixture");
    expect(plan.metadata).toEqual({ platform: "chatgpt", model: "example-model" });
    expect(plan.messages).toEqual([
      { role: "user", text: "Hello ExportAI" },
      { role: "assistant", text: "你好，世界" },
    ]);
  });

  it("rejects an empty conversation", () => {
    const conversation = createBasicConversationFixture();
    conversation.messages = [];

    expect(exportConversationToPdf(conversation)).toEqual({ status: "error", code: "EMPTY_CONVERSATION" });
  });

  it("does not mutate the input conversation", () => {
    const conversation = createBasicConversationFixture();
    conversation.messages.reverse();
    const snapshot = structuredClone(conversation);

    exportConversationToPdf(conversation);

    expect(conversation).toEqual(snapshot);
  });

  it("returns a PDF with a valid %PDF- signature", () => {
    const result = exportConversationToPdf(createBasicConversationFixture());
    expect(result.status).toBe("success");
    if (result.status === "error") throw new Error(result.code);

    expect(hasValidPdfSignature(result.data)).toBe(true);
    expect(String.fromCharCode(result.data[0], result.data[1], result.data[2], result.data[3], result.data[4])).toBe("%PDF-");
  });

  it("returns INVALID_CONVERSATION for structurally invalid input", () => {
    const conversation = createBasicConversationFixture();
    Reflect.deleteProperty(conversation, "id");

    expect(exportConversationToPdf(conversation)).toEqual({ status: "error", code: "INVALID_CONVERSATION" });
  });
});

describe("PDF filename", () => {
  it("keeps Chinese and emoji while replacing Windows-invalid characters", () => {
    expect(createPdfFilename("导出记录 🚀: 2026/08?*")).toBe("导出记录 🚀- 2026-08-.pdf");
  });

  it("uses safe names for blank and Windows-reserved titles", () => {
    expect(createPdfFilename("   ")).toBe("untitled-conversation.pdf");
    expect(createPdfFilename("CON")).toBe("CON-conversation.pdf");
  });
});
