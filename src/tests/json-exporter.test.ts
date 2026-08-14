import { describe, expect, it } from "vitest";
import { createJsonDocument, type JsonExportDocument } from "../exporters/json-document";
import { exportConversationToJson } from "../exporters/json-exporter";
import { createJsonFilename } from "../exporters/json-filename";
import { serializeJsonDocument } from "../exporters/json-serializer";
import type { Conversation, Message, MessageRole } from "../types/conversation";
import { createConversationFixture } from "./fixtures/conversation.fixture";

function requireSuccessfulExport() {
  const result = exportConversationToJson(createConversationFixture());
  expect(result.status).toBe("success");
  if (result.status === "error") throw new Error(`Unexpected export error: ${result.code}`);
  return result;
}

describe("JSON Exporter Core", () => {
  it("exports the stable schema as parseable two-space JSON with one trailing newline", () => {
    const result = requireSuccessfulExport();
    const document = JSON.parse(result.json) as JsonExportDocument;

    expect(Object.keys(document)).toEqual(["schemaVersion", "exportMetadata", "conversationMetadata", "messages"]);
    expect(document.schemaVersion).toBe("1.0");
    expect(document.exportMetadata).toEqual({
      exporter: "ExportAI JSON Exporter",
      exporterVersion: "1.0.0",
      exportedAt: "2026-08-12T12:00:00.000Z",
    });
    expect(document.conversationMetadata).toMatchObject({
      id: "conversation-001",
      title: "ExportAI fixture",
      platform: "chatgpt",
      model: "example-model",
      messageCount: 3,
      isComplete: true,
      parseWarnings: [],
      modelVersion: "1.0",
    });
    expect(result.json).toContain('\n  "schemaVersion": "1.0"');
    expect(result.json.endsWith("\n")).toBe(true);
    expect(result.json.endsWith("\n\n")).toBe(false);
  });

  it("does not mutate the input conversation", () => {
    const conversation = createConversationFixture();
    conversation.messages.reverse();
    const snapshot = structuredClone(conversation);

    exportConversationToJson(conversation);

    expect(conversation).toEqual(snapshot);
  });

  it("preserves user, assistant, system, and unknown messages in order", () => {
    const conversation = createConversationFixture();
    const roles: MessageRole[] = ["unknown", "assistant", "system", "user"];
    conversation.messages = roles.map((role, index): Message => ({
      id: `message-${role}`,
      role,
      order: 3 - index,
      originalText: role,
      blocks: [],
      metadata: {},
    }));
    conversation.metadata.messageCount = conversation.messages.length;

    const document = createJsonDocument(conversation);

    expect(document.messages.map(({ role, order }) => ({ role, order }))).toEqual([
      { role: "user", order: 0 },
      { role: "system", order: 1 },
      { role: "assistant", order: 2 },
      { role: "unknown", order: 3 },
    ]);
  });

  it("preserves every unified block as structured JSON", () => {
    const document = createJsonDocument(createConversationFixture());
    const blocks = document.messages.flatMap((message) => message.blocks);

    expect(blocks.map((block) => block.type)).toEqual([
      "paragraph", "heading", "list", "code", "math", "text", "table", "image", "link", "quote", "thematic-break", "unknown",
    ]);
    expect(blocks.find((block) => block.type === "code")).toMatchObject({ code: "const exportable = true;", language: "ts" });
    expect(blocks.find((block) => block.type === "table")).toMatchObject({ headers: [[{ text: "Name" }]], rows: [[[{ text: "ExportAI" }]]] });
    expect(blocks.find((block) => block.type === "math")).toMatchObject({ latex: "E = mc^2", display: true });
    expect(blocks.find((block) => block.type === "image")).toMatchObject({ src: "https://example.com/image.png", alt: "Example image" });
    expect(blocks.find((block) => block.type === "unknown")).toMatchObject({ rawText: "Unrecognized safe fallback" });
  });

  it("preserves optional image captions and unknown source tags", () => {
    const conversation = createConversationFixture();
    conversation.messages[0].blocks = [
      { id: "image", type: "image", src: "https://example.test/chart.png", alt: "Chart", caption: "Quarterly chart" },
      { id: "unknown", type: "unknown", rawText: "Fallback", sourceTag: "custom-card" },
    ];

    expect(createJsonDocument(conversation).messages[0].blocks).toEqual([
      { id: "image", type: "image", src: "https://example.test/chart.png", alt: "Chart", caption: "Quarterly chart" },
      { id: "unknown", type: "unknown", rawText: "Fallback", sourceTag: "custom-card" },
    ]);
  });

  it("keeps empty messages and defaults metadata.isPartial to false", () => {
    const conversation = createConversationFixture();
    conversation.messages = [{ ...conversation.messages[0], originalText: "", blocks: [], metadata: {} }];
    conversation.metadata.messageCount = 1;

    expect(createJsonDocument(conversation).messages[0]).toEqual({
      id: "message-user-001",
      role: "user",
      order: 0,
      blocks: [],
      originalText: "",
      metadata: { isPartial: false },
    });
  });

  it("keeps partial and image-only messages without Markdown fallback text", () => {
    const conversation = createConversationFixture();
    conversation.messages = [{
      ...conversation.messages[1],
      originalText: "",
      blocks: [{ id: "image-only", type: "image", src: "https://example.test/image.png", alt: "Diagram" }],
      metadata: { isPartial: true },
    }];
    conversation.metadata.messageCount = 1;
    const result = exportConversationToJson(conversation);
    expect(result.status).toBe("success");
    if (result.status === "error") throw new Error(result.code);

    expect(result.json).not.toContain("_No readable content._");
    expect(JSON.parse(result.json).messages[0]).toMatchObject({
      originalText: "",
      metadata: { isPartial: true },
      blocks: [{ type: "image", src: "https://example.test/image.png" }],
    });
  });

  it("rejects an empty conversation without producing JSON", () => {
    const conversation = createConversationFixture();
    conversation.messages = [];
    expect(exportConversationToJson(conversation)).toEqual({ status: "error", code: "EMPTY_CONVERSATION" });
  });

  it("returns SERIALIZATION_FAILED instead of partial JSON", () => {
    const document = createJsonDocument(createConversationFixture());
    Object.assign(document, { circularReference: document });
    expect(serializeJsonDocument(document)).toEqual({ status: "error", code: "SERIALIZATION_FAILED" });
  });

  it("excludes source and injected private fields through whitelist mapping", () => {
    const conversation = createConversationFixture();
    conversation.sourceUrl = "https://example.test/private-page";
    conversation.messages[0].metadata.sourceAttributes = { "data-token": "private-source-attribute" };
    Object.assign(conversation, { pageHtml: "private-page-html", cookie: "private-cookie", token: "private-token" });
    Object.assign(conversation.messages[0].metadata, { authorization: "private-authorization", dom: "private-dom" });

    const result = exportConversationToJson(conversation);
    expect(result.status).toBe("success");
    if (result.status === "error") throw new Error(result.code);
    expect(result.json).not.toContain("private-");
    expect(result.json).not.toContain("sourceAttributes");
  });

  it("preserves public resource field values without JSON-layer cleaning", () => {
    const conversation = createConversationFixture();
    conversation.messages[0].blocks = [
      { id: "blob-image", type: "image", src: "blob:https://example.test/private-id", alt: "Blob image" },
      { id: "local-image", type: "image", src: "C:\\Users\\Example\\private.png", alt: "Local image" },
      { id: "local-link", type: "link", href: "file:///private/document", content: [{ text: "Local document" }] },
      { id: "remote-image", type: "image", src: "https://example.test/public.png", alt: "Remote image" },
    ];

    const document = createJsonDocument(conversation);
    expect(document.messages[0].blocks).toMatchObject([
      { src: "blob:https://example.test/private-id" },
      { src: "C:\\Users\\Example\\private.png" },
      { href: "file:///private/document" },
      { src: "https://example.test/public.png" },
    ]);
  });

  it.each([
    ["missing conversation ID", (conversation: Conversation) => { Reflect.deleteProperty(conversation, "id"); }],
    ["missing message ID", (conversation: Conversation) => { Reflect.deleteProperty(conversation.messages[0], "id"); }],
    ["messageCount mismatch", (conversation: Conversation) => { conversation.metadata.messageCount += 1; }],
    ["negative message order", (conversation: Conversation) => { conversation.messages[0].order = -1; }],
    ["duplicate message order", (conversation: Conversation) => { conversation.messages[1].order = conversation.messages[0].order; }],
    ["missing required block field", (conversation: Conversation) => {
      const codeBlock = conversation.messages[1].blocks.find((block) => block.type === "code");
      if (codeBlock !== undefined) Reflect.deleteProperty(codeBlock, "code");
    }],
    ["non-finite heading level", (conversation: Conversation) => {
      const heading = conversation.messages[1].blocks.find((block) => block.type === "heading");
      if (heading !== undefined) Object.assign(heading, { level: Number.POSITIVE_INFINITY });
    }],
  ])("returns INVALID_CONVERSATION for %s", (_caseName, mutate) => {
    const conversation = createConversationFixture();
    mutate(conversation);

    expect(exportConversationToJson(conversation)).toEqual({ status: "error", code: "INVALID_CONVERSATION" });
  });

  it("keeps 500 messages in deterministic order", () => {
    const conversation = createConversationFixture();
    conversation.messages = Array.from({ length: 500 }, (_, index): Message => ({
      id: `message-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      order: 499 - index,
      originalText: `Message ${index}`,
      blocks: [{ id: `block-${index}`, type: "text", content: [{ text: `Message ${index}` }] }],
      metadata: {},
    }));
    conversation.metadata.messageCount = 500;

    const document = createJsonDocument(conversation);
    expect(document.messages).toHaveLength(500);
    expect(document.messages[0].order).toBe(0);
    expect(document.messages[499].order).toBe(499);
  });
});

describe("JSON filename", () => {
  it("keeps Chinese and emoji while replacing Windows-invalid characters", () => {
    expect(createJsonFilename("导出记录 🚀: 2026/08?*")).toBe("导出记录 🚀- 2026-08-.json");
  });

  it("uses safe names for blank and Windows-reserved titles", () => {
    expect(createJsonFilename("   ")).toBe("untitled-conversation.json");
    expect(createJsonFilename("CON")).toBe("CON-conversation.json");
  });
});
