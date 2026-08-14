// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { ChatGPTAdapter } from "../adapters/chatgpt/chatgpt-adapter";
import { parseChatGPTBlocks } from "../adapters/chatgpt/chatgpt-block-parser";
import type { AdapterParseResult } from "../adapters/types";
import { exportConversationToJson } from "../exporters/json-exporter";
import { exportConversationToMarkdown } from "../exporters/markdown-exporter";
import type { Block, Conversation } from "../types/conversation";
import {
  CHATGPT_LOCATION,
  accessibilityLabelsFixture,
  assistantImageOnlyWithActionsFixture,
  assistantImageOnlyWithPaginationFixture,
  assistantImageTextWithPaginationFixture,
  emptyConversationFixture,
  legitimatePaginationTextFixture,
  missingTitleFixture,
  multiTurnFixture,
  nineTurnConversationFixture,
  richContentFixture,
  singleTurnFixture,
  structuredCompatibilityFixture,
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

function structuredConversation(): Conversation {
  return conversationFrom(new ChatGPTAdapter().parse(parseDocument(structuredCompatibilityFixture()), CHATGPT_LOCATION));
}

function structuredBlocks(): Block[] {
  return structuredConversation().messages[1].blocks;
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

  it("removes image response pagination UI while preserving an image-only assistant", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(assistantImageOnlyWithPaginationFixture()), CHATGPT_LOCATION));
    const assistantMessage = conversation.messages[1];

    expect(assistantMessage.blocks).toHaveLength(1);
    expect(assistantMessage.blocks[0]).toMatchObject({
      type: "image",
      src: "https://images.example.test/generated-landscape.png",
      alt: "Generated landscape",
    });
    expect(assistantMessage.originalText).toBe("");
    expect(assistantMessage.metadata.isPartial).not.toBe(true);
    expect(conversation.metadata.parseWarnings.map((warning) => warning.code)).not.toContain("chatgpt-message-empty-blocks");
  });

  it("keeps real image response text while removing its pagination UI", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(assistantImageTextWithPaginationFixture()), CHATGPT_LOCATION));
    const assistantMessage = conversation.messages[1];
    const serializedMessage = JSON.stringify(assistantMessage);

    expect(assistantMessage.originalText).toBe("Here is the updated image.");
    expect(assistantMessage.blocks).toContainEqual(expect.objectContaining({ type: "image" }));
    expect(serializedMessage).toContain("Here is the updated image.");
    expect(serializedMessage).not.toContain("Previous response");
    expect(serializedMessage).not.toContain("Next response");
    expect(serializedMessage).not.toContain("2/2");
  });

  it("preserves ordinary assistant text containing 2/2", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(legitimatePaginationTextFixture()), CHATGPT_LOCATION));
    const assistantMessage = conversation.messages[1];

    expect(assistantMessage.originalText).toBe("The score is 2/2.");
    expect(JSON.stringify(assistantMessage.blocks)).toContain("The score is 2/2.");
  });

  it("keeps Markdown and JSON free of image pagination artifacts", () => {
    const conversation = conversationFrom(new ChatGPTAdapter().parse(parseDocument(assistantImageOnlyWithPaginationFixture()), CHATGPT_LOCATION));
    const markdownResult = exportConversationToMarkdown(conversation);
    const jsonResult = exportConversationToJson(conversation);

    expect(markdownResult.status).toBe("success");
    if (markdownResult.status === "error") throw new Error(markdownResult.code);
    expect(markdownResult.markdown).toContain("![Generated landscape](<https://images.example.test/generated-landscape.png>)");
    expect(markdownResult.markdown).not.toContain("2/2");

    expect(jsonResult.status).toBe("success");
    if (jsonResult.status === "error") throw new Error(jsonResult.code);
    const jsonDocument = JSON.parse(jsonResult.json) as { messages: Array<{ originalText: string; blocks: Block[]; metadata: { isPartial: boolean } }> };
    const assistantMessage = jsonDocument.messages[1];
    expect(assistantMessage.originalText).toBe("");
    expect(assistantMessage.blocks).toHaveLength(1);
    expect(assistantMessage.blocks[0]).toMatchObject({ type: "image" });
    expect(assistantMessage.metadata.isPartial).toBe(false);
    expect(jsonResult.json).not.toContain("2/2");
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

  it("extracts real ChatGPT math source once and detects display math", () => {
    const blocks = structuredBlocks();
    const math = blocks.filter((block) => block.type === "math");

    expect(math).toEqual([
      expect.objectContaining({ latex: "E = mc^2", display: false }),
      expect.objectContaining({ latex: "x^2 + y^2 = z^2", display: true }),
      expect.objectContaining({ latex: "a^2 + b^2 = c^2", display: false }),
    ]);
    expect(blocks.map((block) => block.type).slice(3, 8)).toEqual(["paragraph", "math", "paragraph", "math", "paragraph"]);
  });

  it("preserves CodeMirror line boundaries and extracts normalized languages", () => {
    const code = structuredBlocks().filter((block) => block.type === "code");

    expect(code).toEqual([
      expect.objectContaining({ language: "typescript", code: 'const message = "ExportAI";\nconsole.log(message);' }),
      expect.objectContaining({ language: "javascript", code: 'const mixed = "content";\nconsole.log(mixed);' }),
      expect.objectContaining({ language: "text", code: "```text\nliteral fence\n```" }),
    ]);
    expect(JSON.stringify(code)).not.toContain("Copy");
  });

  it("trims only list item boundary whitespace and preserves nested and internal newlines", () => {
    const lists = structuredBlocks().filter((block) => block.type === "list");
    expect(lists).toHaveLength(2);
    const unordered = lists[0];
    const ordered = lists[1];
    if (unordered?.type !== "list" || ordered?.type !== "list") throw new Error("Expected lists");

    expect(unordered.items.map((item) => item.content.map((part) => part.text).join(""))).toEqual([
      "Apple",
      "Banana",
      "Orange",
      "Parent A",
      "Line 1\nLine 2",
    ]);
    expect(unordered.items[3].children?.items.map((item) => item.content.map((part) => part.text).join(""))).toEqual(["Child A1", "Child A2"]);
    expect(ordered.ordered).toBe(true);
    expect(ordered.items.map((item) => item.content.map((part) => part.text).join(""))).toEqual(["First", "Second", "Third"]);
  });

  it("exports corrected structured content through Markdown without exporter changes", () => {
    const result = exportConversationToMarkdown(structuredConversation());
    expect(result.status).toBe("success");
    if (result.status === "error") throw new Error(result.code);

    expect(result.markdown).toContain('```typescript\nconst message = "ExportAI";\nconsole.log(message);\n```');
    expect(result.markdown).toContain('```javascript\nconst mixed = "content";\nconsole.log(mixed);\n```');
    expect(result.markdown).toContain("$E = mc^2$");
    expect(result.markdown).toContain("$$\nx^2 + y^2 = z^2\n$$");
    expect(result.markdown).toContain("$a^2 + b^2 = c^2$");
    expect(result.markdown).toContain("- Apple\n- Banana\n- Orange\n- Parent A\n  - Child A1\n  - Child A2");
    expect(result.markdown).toContain("1. First\n2. Second\n3. Third");
    expect(result.markdown).not.toContain("TypeScriptconst message");
  });

  it("exports corrected structured blocks through JSON without exporter changes", () => {
    const result = exportConversationToJson(structuredConversation());
    expect(result.status).toBe("success");
    if (result.status === "error") throw new Error(result.code);
    const document = JSON.parse(result.json) as { messages: Array<{ blocks: Block[] }> };
    const blocks = document.messages[1].blocks;

    expect(blocks.filter((block) => block.type === "math")).toHaveLength(3);
    expect(blocks).toContainEqual(expect.objectContaining({
      type: "code",
      language: "typescript",
      code: 'const message = "ExportAI";\nconsole.log(message);',
    }));
    expect(blocks).toContainEqual(expect.objectContaining({
      type: "code",
      language: "javascript",
      code: 'const mixed = "content";\nconsole.log(mixed);',
    }));
    expect(result.json).toContain('"text": "Apple"');
    expect(result.json).not.toContain('"text": "\\nApple\\n"');
    expect(result.json).not.toContain("TypeScriptconst message");
  });
});
