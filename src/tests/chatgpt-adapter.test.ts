// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { ChatGPTAdapter } from "../adapters/chatgpt/chatgpt-adapter";
import { parseChatGPTBlocks } from "../adapters/chatgpt/chatgpt-block-parser";
import type { AdapterParseResult } from "../adapters/types";
import { exportConversationToMarkdown } from "../exporters/markdown-exporter";
import type { Block, Conversation } from "../types/conversation";
import {
  CHATGPT_LOCATION,
  accessibilityLabelsFixture,
  assistantImageOnlyWithActionsFixture,
  emptyConversationFixture,
  missingTitleFixture,
  multiTurnFixture,
  nineTurnConversationFixture,
  richContentFixture,
  singleTurnFixture,
  unknownNodeFixture,
} from "./fixtures/chatgpt-dom.fixture";

function parseDocument(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function conversationFrom(result: AdapterParseResult): Conversation {
  expect(result.status).toBe("success");
  if (result.status !== "success") throw new Error(`Expected success, received ${result.status}`);
  return result.conversation;
}

function richBlocks(): Block[] {
  return conversationFrom(new ChatGPTAdapter().parse(parseDocument(richContentFixture()), CHATGPT_LOCATION)).messages[1].blocks;
}

describe("ChatGPTAdapter page and conversation detection", () => {
  it("recognizes current and legacy ChatGPT hostnames without accepting unrelated pages", () => {
    const adapter = new ChatGPTAdapter();
    expect(adapter.isSupportedPage(CHATGPT_LOCATION)).toBe(true);
    expect(adapter.isSupportedPage({ ...CHATGPT_LOCATION, hostname: "chat.openai.com" })).toBe(true);
    expect(adapter.isSupportedPage({ ...CHATGPT_LOCATION, hostname: "example.com" })).toBe(false);
  });

  it("reports a supported page with no detected conversation as empty", () => {
    expect(new ChatGPTAdapter().parse(parseDocument(emptyConversationFixture()), CHATGPT_LOCATION)).toEqual({
      status: "empty",
      reason: "ChatGPT is supported, but no readable conversation was detected on this page.",
    });
  });

  it("uses the active conversation link as the title", () => {
    expect(conversationFrom(new ChatGPTAdapter().parse(parseDocument(singleTurnFixture()), CHATGPT_LOCATION)).title).toBe("Single turn");
  });

  it("normalizes a missing title and records a warning", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(missingTitleFixture()), CHATGPT_LOCATION));
    expect(conversation.title).toBe("Untitled conversation");
    expect(conversation.metadata.parseWarnings.map((warning) => warning.code)).toContain("chatgpt-title-missing");
  });
});

describe("ChatGPTAdapter messages", () => {
  it("parses one user and one assistant message", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(singleTurnFixture()), CHATGPT_LOCATION));
    expect(conversation.messages.map((message) => [message.role, message.originalText])).toEqual([
      ["user", "Hello"],
      ["assistant", "Hi there"],
    ]);
  });

  it("filters the user sr-only label without dropping the real user content", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(accessibilityLabelsFixture()), CHATGPT_LOCATION));
    const userMessage = conversation.messages[0];

    expect(userMessage.originalText).toBe("Keep the real user question.");
    expect(JSON.stringify(userMessage.blocks)).not.toContain("You said:");
    expect(userMessage.blocks).toContainEqual(expect.objectContaining({
      type: "paragraph",
      content: expect.arrayContaining([expect.objectContaining({ text: "Keep the real user question." })]),
    }));
  });

  it("filters the assistant sr-only label without dropping the real assistant content", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(accessibilityLabelsFixture()), CHATGPT_LOCATION));
    const assistantMessage = conversation.messages[1];

    expect(assistantMessage.originalText).toBe("Keep the real assistant answer.");
    expect(JSON.stringify(assistantMessage.blocks)).not.toContain("ChatGPT said:");
    expect(assistantMessage.blocks).toContainEqual(expect.objectContaining({
      type: "paragraph",
      content: expect.arrayContaining([expect.objectContaining({ text: "Keep the real assistant answer." })]),
    }));
  });

  it("keeps the message count while excluding accessibility labels from Markdown", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(accessibilityLabelsFixture()), CHATGPT_LOCATION));
    const result = exportConversationToMarkdown(conversation);

    expect(conversation.messages).toHaveLength(2);
    expect(conversation.metadata.messageCount).toBe(2);
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("Expected Markdown export success");
    expect(result.markdown).toContain("Keep the real user question.");
    expect(result.markdown).toContain("Keep the real assistant answer.");
    expect(result.markdown).not.toContain("You said:");
    expect(result.markdown).not.toContain("ChatGPT said:");
  });

  it("keeps an image-only assistant message structured and complete", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(assistantImageOnlyWithActionsFixture()), CHATGPT_LOCATION));
    const assistantMessage = conversation.messages[1];

    expect(assistantMessage.blocks).toContainEqual(expect.objectContaining({
      type: "image",
      src: "https://images.example.test/generated-landscape.png",
      alt: "Generated landscape",
    }));
    expect(assistantMessage.metadata.isPartial).not.toBe(true);
    expect(conversation.metadata.parseWarnings.map((warning) => warning.code)).not.toContain("chatgpt-message-empty-blocks");
  });

  it("removes assistant action controls from blocks and original text", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(assistantImageOnlyWithActionsFixture()), CHATGPT_LOCATION));
    const assistantMessage = conversation.messages[1];
    const serializedBlocks = JSON.stringify(assistantMessage.blocks);

    expect(assistantMessage.originalText).toBe("");
    expect(serializedBlocks).not.toContain("Edit");
    expect(serializedBlocks).not.toContain("Copy response");
    expect(serializedBlocks).not.toContain("Like");
    expect(serializedBlocks).not.toContain("Dislike");
  });

  it("does not mark a normal assistant text message as partial", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(singleTurnFixture()), CHATGPT_LOCATION));

    expect(conversation.messages[1].metadata.isPartial).not.toBe(true);
  });

  it("exports an image-only assistant without partial or action UI text", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(assistantImageOnlyWithActionsFixture()), CHATGPT_LOCATION));
    const result = exportConversationToMarkdown(conversation);

    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("Expected Markdown export success");
    expect(result.markdown).toContain("![Generated landscape](<https://images.example.test/generated-landscape.png>)");
    expect(result.markdown).not.toContain("Export note: this message may be incomplete.");
    expect(result.markdown).not.toContain("Edit");
    expect(result.markdown).not.toContain("Copy response");
    expect(result.markdown).not.toContain("Like");
    expect(result.markdown).not.toContain("Dislike");
  });

  it("preserves DOM order across multiple turns", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(multiTurnFixture()), CHATGPT_LOCATION));
    expect(conversation.messages.map((message) => message.role)).toEqual(["user", "assistant", "user", "assistant"]);
    expect(conversation.messages.map((message) => message.order)).toEqual([0, 1, 2, 3]);
  });

  it("parses nine conversation turns as eighteen alternating messages", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(nineTurnConversationFixture()), CHATGPT_LOCATION));
    expect(conversation.messages).toHaveLength(18);
    expect(conversation.metadata.messageCount).toBe(conversation.messages.length);
    expect(conversation.messages.map((message) => message.role)).toEqual(
      Array.from({ length: 9 }, () => ["user", "assistant"] as const).flat(),
    );
  });

  it("keeps the conversation when one message parser throws", () => {
    const adapter = new ChatGPTAdapter({
      parseBlocks(container, context) {
        if (container.getAttribute("data-message-author-role") === "assistant") throw new Error("fixture failure");
        return parseChatGPTBlocks(container, context);
      },
    });
    const conversation = conversationFrom(adapter.parse(parseDocument(singleTurnFixture()), CHATGPT_LOCATION));
    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[1].metadata.isPartial).toBe(true);
    expect(conversation.messages[1].blocks[0].type).toBe("unknown");
    expect(conversation.metadata.parseWarnings.map((warning) => warning.code)).toContain("chatgpt-message-parse-failed");
  });
});

describe("ChatGPTAdapter structured blocks", () => {
  it("parses headings", () => {
    expect(richBlocks()).toContainEqual(expect.objectContaining({ type: "heading", level: 2 }));
  });

  it("preserves bold and italic inline emphasis", () => {
    const paragraph = richBlocks().find((block) => block.type === "paragraph");
    expect(paragraph?.type).toBe("paragraph");
    if (paragraph?.type !== "paragraph") throw new Error("Expected paragraph");
    expect(paragraph.content).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: "Bold", bold: true }),
      expect.objectContaining({ text: "italic", italic: true }),
    ]));
  });

  it("parses lists and nested lists", () => {
    const list = richBlocks().find((block) => block.type === "list");
    expect(list?.type).toBe("list");
    if (list?.type !== "list") throw new Error("Expected list");
    expect(list.ordered).toBe(false);
    expect(list.items[0].children?.items[0].content).toContainEqual(expect.objectContaining({ text: "Child", bold: true }));
  });

  it("parses fenced code semantics and language", () => {
    expect(richBlocks()).toContainEqual(expect.objectContaining({ type: "code", language: "ts", code: "const ready = true;" }));
  });

  it("parses table headers and rows", () => {
    expect(richBlocks()).toContainEqual(expect.objectContaining({
      type: "table",
      headers: [[expect.objectContaining({ text: "Name" })], [expect.objectContaining({ text: "Value" })]],
      rows: [[[expect.objectContaining({ text: "ExportAI" })], [expect.objectContaining({ text: "Local" })]]],
    }));
  });

  it("preserves LaTeX rather than rendered math text", () => {
    expect(richBlocks()).toContainEqual(expect.objectContaining({ type: "math", latex: "E = mc^2", display: false }));
  });

  it("parses images", () => {
    expect(richBlocks()).toContainEqual(expect.objectContaining({ type: "image", src: "https://images.example.test/chart.png", alt: "Chart" }));
  });

  it("parses standalone links", () => {
    expect(richBlocks()).toContainEqual(expect.objectContaining({ type: "link", href: "https://example.test/reference" }));
  });

  it("parses quotes", () => {
    const quote = richBlocks().find((block) => block.type === "quote");
    expect(quote?.type).toBe("quote");
    if (quote?.type !== "quote") throw new Error("Expected quote");
    expect(quote.blocks).toContainEqual(expect.objectContaining({ type: "paragraph" }));
  });

  it("keeps mixed content in source order", () => {
    expect(richBlocks().map((block) => block.type)).toEqual([
      "heading", "paragraph", "list", "code", "table", "paragraph", "math", "paragraph", "image", "link", "quote", "thematic-break",
    ]);
  });

  it("preserves unknown nodes as controlled fallback blocks", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(unknownNodeFixture()), CHATGPT_LOCATION));
    expect(conversation.messages[1].blocks).toContainEqual(expect.objectContaining({ type: "unknown", rawText: "Readable fallback", sourceTag: "exportai-unknown" }));
    expect(conversation.metadata.parseWarnings.map((warning) => warning.code)).toContain("chatgpt-unknown-block");
  });
});
