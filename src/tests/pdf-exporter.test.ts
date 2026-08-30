import { describe, expect, it } from "vitest";
import { createPdfDocumentPlan } from "../exporters/pdf-document";
import { exportConversationToPdf } from "../exporters/pdf-exporter";
import { createPdfFilename } from "../exporters/pdf-filename";
import { hasValidPdfSignature } from "../exporters/pdf-types";
import { getMessageBodyLayoutContext } from "../exporters/pdf-block-renderer";
import type { Conversation } from "../types/conversation";
import { createConversationFixture } from "./fixtures/conversation.fixture";

const PNG_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const JPEG_DATA_URI = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/Aaf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/Aaf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z";

function createImageConversation(src: string, alt = "Image alt", caption?: string): Conversation {
  const fixture = createConversationFixture();
  return {
    ...fixture,
    title: "Image PDF fixture",
    messages: [{
      id: "image-message-001",
      role: "assistant",
      order: 0,
      originalText: alt,
      blocks: [{ id: "image-block-001", type: "image", src, alt, caption }],
      metadata: {},
    }],
    metadata: { ...fixture.metadata, messageCount: 1 },
  };
}

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

function createStructuredConversationFixture(): Conversation {
  const fixture = createConversationFixture();
  return {
    ...fixture,
    title: "Structured PDF fixture",
    messages: [
      {
        id: "message-user-001",
        role: "user",
        order: 0,
        originalText: "Structured content sample",
        blocks: [
          {
            id: "block-inline-001",
            type: "paragraph",
            content: [
              { text: "Plain " },
              { text: "bold", bold: true },
              { text: " " },
              { text: "italic", italic: true },
              { text: " " },
              { text: "strike", strikethrough: true },
              { text: " " },
              { text: "code", code: true },
              { text: " " },
              { text: "link", href: "https://example.com" },
            ],
          },
          { id: "block-heading-001", type: "heading", level: 1, content: [{ text: "Heading One" }] },
          { id: "block-heading-002", type: "heading", level: 2, content: [{ text: "Heading Two" }] },
          { id: "block-heading-003", type: "heading", level: 3, content: [{ text: "Heading Three" }] },
          { id: "block-heading-004", type: "heading", level: 4, content: [{ text: "Heading Four" }] },
          { id: "block-heading-005", type: "heading", level: 5, content: [{ text: "Heading Five" }] },
          { id: "block-heading-006", type: "heading", level: 6, content: [{ text: "Heading Six" }] },
          {
            id: "block-code-001",
            type: "code",
            language: "ts",
            code: "const first = true;\nconst second = false;",
          },
          {
            id: "block-list-unordered-001",
            type: "list",
            ordered: false,
            items: [{ id: "list-item-001", content: [{ text: "Unordered item" }] }],
          },
          {
            id: "block-table-001",
            type: "table",
            headers: [[{ text: "Name", bold: true }], [{ text: "Description" }]],
            rows: [
              [[{ text: "ExportAI" }], [{ text: "Local-first exporter" }]],
              [[{ text: "中文" }], [{ text: "支持多行\n文本" }]],
              [[], [{ text: "This is a deliberately long table cell that must wrap across many lines without being clipped or omitted from the generated PDF. " .repeat(8) }]],
            ],
          },
          {
            id: "block-list-ordered-001",
            type: "list",
            ordered: true,
            items: [{ id: "list-item-002", content: [{ text: "Ordered item" }] }],
          },
          {
            id: "block-list-nested-001",
            type: "list",
            ordered: false,
            items: [
              {
                id: "list-item-003",
                content: [{ text: "Parent item" }],
                children: {
                  id: "block-list-nested-child-001",
                  type: "list",
                  ordered: true,
                  items: [{ id: "list-item-004", content: [{ text: "Nested child", bold: true }] }],
                },
              },
            ],
          },
          {
            id: "block-quote-001",
            type: "quote",
            blocks: [
              {
                id: "block-quote-paragraph-001",
                type: "paragraph",
                content: [{ text: "Quoted text" }],
              },
              {
                id: "block-quote-nested-001",
                type: "quote",
                blocks: [{ id: "block-quote-nested-paragraph-001", type: "paragraph", content: [{ text: "Nested quote" }] }],
              },
            ],
          },
          { id: "block-break-001", type: "thematic-break" },
        ],
        metadata: {},
      },
    ],
    metadata: { ...fixture.metadata, messageCount: 1 },
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
    expect(plan.metadata).toEqual({ platform: "chatgpt", model: "example-model", exportedAt: "2026-08-12T12:00:00.000Z" });
    expect(plan.messages).toHaveLength(2);
    expect(plan.messages[0]).toMatchObject({
      id: "message-user-001",
      role: "user",
      blocks: [{ type: "paragraph", content: [{ text: "Hello ExportAI" }] }],
    });
    expect(plan.messages[1]).toMatchObject({
      id: "message-assistant-001",
      role: "assistant",
      blocks: [{ type: "text", content: [{ text: "你好，世界" }] }],
    });
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

describe("PDF Structured Content Rendering", () => {
  it("provides the message body container geometry to block renderers", () => {
    const state = {
      y: 42,
    } as Parameters<typeof getMessageBodyLayoutContext>[0];

    expect(getMessageBodyLayoutContext(state, 100, 80)).toEqual({
      x: 100,
      y: 42,
      width: 80,
      availableWidth: 80,
    });
  });

  it("maps inline styles into the document plan", () => {
    const plan = createPdfDocumentPlan(createStructuredConversationFixture());
    const blocks = plan.messages[0]?.blocks ?? [];

    expect(blocks[0]).toEqual({
      type: "paragraph",
      content: [
        { text: "Plain " },
        { text: "bold", bold: true },
        { text: " " },
        { text: "italic", italic: true },
        { text: " " },
        { text: "strike", strikethrough: true },
        { text: " " },
        { text: "code", code: true },
        { text: " " },
        { text: "link", href: "https://example.com/" },
      ],
    });
  });

  it("maps heading levels 1 through 6", () => {
    const plan = createPdfDocumentPlan(createStructuredConversationFixture());
    const blocks = plan.messages[0]?.blocks ?? [];

    expect(blocks.slice(1, 7)).toEqual([
      { type: "heading", level: 1, content: [{ text: "Heading One" }] },
      { type: "heading", level: 2, content: [{ text: "Heading Two" }] },
      { type: "heading", level: 3, content: [{ text: "Heading Three" }] },
      { type: "heading", level: 4, content: [{ text: "Heading Four" }] },
      { type: "heading", level: 5, content: [{ text: "Heading Five" }] },
      { type: "heading", level: 6, content: [{ text: "Heading Six" }] },
    ]);
  });

  it("maps code blocks with language and preserved newlines", () => {
    const plan = createPdfDocumentPlan(createStructuredConversationFixture());
    const codeBlock = plan.messages[0]?.blocks.find((block) => block.type === "code");

    expect(codeBlock).toEqual({
      type: "code",
      language: "ts",
      code: "const first = true;\nconst second = false;",
    });
  });

  it("maps ordered, unordered, and nested lists", () => {
    const plan = createPdfDocumentPlan(createStructuredConversationFixture());
    const listBlocks = plan.messages[0]?.blocks.filter((block) => block.type === "list") ?? [];

    expect(listBlocks[0]).toEqual({
      type: "list",
      ordered: false,
      items: [{ content: [{ text: "Unordered item" }] }],
    });
    expect(listBlocks[1]).toEqual({
      type: "list",
      ordered: true,
      items: [{ content: [{ text: "Ordered item" }] }],
    });
    expect(listBlocks[2]).toEqual({
      type: "list",
      ordered: false,
      items: [
        {
          content: [{ text: "Parent item" }],
          children: {
            ordered: true,
            items: [{ content: [{ text: "Nested child", bold: true }] }],
          },
        },
      ],
    });
  });

  it("maps nested quote blocks", () => {
    const plan = createPdfDocumentPlan(createStructuredConversationFixture());
    const quoteBlock = plan.messages[0]?.blocks.find((block) => block.type === "quote");

    expect(quoteBlock).toEqual({
      type: "quote",
      blocks: [
        { type: "paragraph", content: [{ text: "Quoted text" }] },
        {
          type: "quote",
          blocks: [{ type: "paragraph", content: [{ text: "Nested quote" }] }],
        },
      ],
    });
  });

  it("maps thematic breaks", () => {
    const plan = createPdfDocumentPlan(createStructuredConversationFixture());
    const breakBlock = plan.messages[0]?.blocks.find((block) => block.type === "thematic-break");

    expect(breakBlock).toEqual({ type: "thematic-break" });
  });

  it("maps table headers, rows, and inline cell content", () => {
    const plan = createPdfDocumentPlan(createStructuredConversationFixture());
    const tableBlock = plan.messages[0]?.blocks.find((block) => block.type === "table");

    expect(tableBlock).toEqual({
      type: "table",
      headers: [[{ text: "Name", bold: true }], [{ text: "Description" }]],
      rows: [
        [[{ text: "ExportAI" }], [{ text: "Local-first exporter" }]],
        [[{ text: "中文" }], [{ text: "支持多行\n文本" }]],
        [[], [{ text: "This is a deliberately long table cell that must wrap across many lines without being clipped or omitted from the generated PDF. " .repeat(8) }]],
      ],
    });
  });

  it("exports basic, Chinese, empty, and long-wrapped tables to a valid PDF", () => {
    const conversation = createStructuredConversationFixture();
    const table = conversation.messages[0]?.blocks.find((block) => block.type === "table");
    expect(table?.type).toBe("table");

    const result = exportConversationToPdf(conversation);
    expect(result.status).toBe("success");
    if (result.status === "error") throw new Error(result.code);
    expect(hasValidPdfSignature(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("exports structured content to a valid PDF", () => {
    const result = exportConversationToPdf(createStructuredConversationFixture());

    expect(result.status).toBe("success");
    if (result.status === "error") throw new Error(result.code);

    expect(hasValidPdfSignature(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });
});

describe("PDF Math and Unknown Rendering", () => {
  it("renders inline math as LaTeX source and aggregates its warning", () => {
    const conversation = createBasicConversationFixture();
    conversation.messages[0]!.blocks = [{ id: "math-inline", type: "math", latex: "x^2 + y^2", display: false }];

    const plan = createPdfDocumentPlan(conversation);
    expect(plan.messages[0]?.blocks).toEqual([{ type: "math", text: "$x^2 + y^2$" }]);
    expect(plan.warnings.map((warning) => warning.code)).toEqual(["MATH_LATEX_SOURCE_FALLBACK"]);
  });

  it("renders display and empty math source without dropping the block", () => {
    const conversation = createBasicConversationFixture();
    conversation.messages[0]!.blocks = [
      { id: "math-display", type: "math", latex: "\\int_0^1 x dx", display: true },
      { id: "math-empty", type: "math", latex: "", display: false },
    ];

    const plan = createPdfDocumentPlan(conversation);
    expect(plan.messages[0]?.blocks).toEqual([
      { type: "math", text: "$$\n\\int_0^1 x dx\n$$" },
      { type: "math", text: "$$" },
    ]);
    expect(plan.warnings).toHaveLength(2);
    expect(exportConversationToPdf(conversation)).toMatchObject({ status: "success" });
  });

  it("renders unknown raw text and the required empty placeholder", () => {
    const conversation = createBasicConversationFixture();
    conversation.messages[0]!.blocks = [
      { id: "unknown-text", type: "unknown", rawText: "Preserved fallback" },
      { id: "unknown-empty", type: "unknown", rawText: "   " },
    ];

    const plan = createPdfDocumentPlan(conversation);
    expect(plan.messages[0]?.blocks).toEqual([
      { type: "unknown", text: "Preserved fallback" },
      { type: "unknown", text: "[Unsupported content]" },
    ]);
    expect(plan.warnings.map((warning) => warning.code)).toEqual([
      "UNKNOWN_BLOCK_FALLBACK",
      "UNKNOWN_BLOCK_EMPTY",
    ]);
  });

  it("returns aggregated math and unknown warnings with a valid PDF", () => {
    const conversation = createBasicConversationFixture();
    conversation.messages[0]!.blocks = [
      { id: "math", type: "math", latex: "a+b", display: false },
      { id: "unknown", type: "unknown", rawText: "Raw content" },
    ];

    const result = exportConversationToPdf(conversation);
    expect(result.status).toBe("success");
    if (result.status === "error") throw new Error(result.code);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      "MATH_LATEX_SOURCE_FALLBACK",
      "UNKNOWN_BLOCK_FALLBACK",
    ]);
    expect(hasValidPdfSignature(result.data)).toBe(true);
  });
});

describe("PDF Image Rendering", () => {
  it("embeds a PNG data URI", () => {
    const result = exportConversationToPdf(createImageConversation(PNG_DATA_URI));

    expect(result.status).toBe("success");
    if (result.status === "error") throw new Error(result.code);
    expect(result.warnings).toEqual([]);
    expect(hasValidPdfSignature(result.data)).toBe(true);
  });

  it("embeds a JPEG data URI", () => {
    const result = exportConversationToPdf(createImageConversation(JPEG_DATA_URI));

    expect(result.status).toBe("success");
    if (result.status === "error") throw new Error(result.code);
    expect(result.warnings).toEqual([]);
    expect(hasValidPdfSignature(result.data)).toBe(true);
  });

  it("renders alt text and caption for a broken image", () => {
    const result = exportConversationToPdf(createImageConversation("data:image/png;base64,broken", "Fallback alt", "Fallback caption"));

    expect(result.status).toBe("success");
    if (result.status === "error") throw new Error(result.code);
    expect(result.warnings.map((warning) => warning.code)).toContain("IMAGE_EMBED_FAILED");
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("preserves caption for an embedded image", () => {
    const result = exportConversationToPdf(createImageConversation(PNG_DATA_URI, "Diagram", "A small diagram"));

    expect(result.status).toBe("success");
    if (result.status === "error") throw new Error(result.code);
    expect(result.warnings).toEqual([]);
  });

  it("uses fallback text and warning for an unsafe remote URL", () => {
    const result = exportConversationToPdf(createImageConversation("https://example.com/image.png", "Remote image"));

    expect(result.status).toBe("success");
    if (result.status === "error") throw new Error(result.code);
    expect(result.warnings.map((warning) => warning.code)).toContain("IMAGE_UNSAFE_SOURCE");
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("keeps the PDF valid when one image fails", () => {
    const conversation = createImageConversation("data:image/jpeg;base64,not-valid", "Broken image");
    conversation.messages[0]!.blocks.push({
      id: "paragraph-after-image",
      type: "paragraph",
      content: [{ text: "Text after broken image" }],
    });

    const result = exportConversationToPdf(conversation);
    expect(result.status).toBe("success");
    if (result.status === "error") throw new Error(result.code);
    expect(hasValidPdfSignature(result.data)).toBe(true);
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

describe("PDF document title and metadata", () => {
  it("uses the conversation title when it is present", () => {
    expect(createPdfDocumentPlan(createBasicConversationFixture()).title).toBe("ExportAI PDF fixture");
  });

  it("keeps the conversation title as the sole PDF title source", () => {
    const conversation = createBasicConversationFixture();
    conversation.title = "   ";
    conversation.messages[0]!.originalText = "  Analyze Chrome extension architecture  ";
    expect(createPdfDocumentPlan(conversation).title).toBe("   ");

    conversation.messages[0]!.originalText = "   ";
    conversation.messages[1]!.blocks = [{ id: "fallback-heading", type: "heading", level: 1, content: [{ text: "Heading One" }] }];
    expect(createPdfDocumentPlan(conversation).title).toBe("   ");
  });

  it("preserves the conversation title without content-derived normalization", () => {
    const conversation = createBasicConversationFixture();
    conversation.title = "<invalid>:/\\|?*" + "x".repeat(200);
    conversation.messages = conversation.messages.map((message) => ({ ...message, originalText: "   ", blocks: [] }));
    expect(createPdfDocumentPlan(conversation).title).toBe(conversation.title);

    conversation.title = "   ";
    expect(createPdfDocumentPlan(conversation).title).toBe("   ");
  });

  it("uses the conversation title for both the filename and document title", () => {
    const conversation = createBasicConversationFixture();
    conversation.title = "   ";
    const result = exportConversationToPdf(conversation);
    expect(result).toMatchObject({ status: "success", filename: "untitled-conversation.pdf" });
    expect(createPdfDocumentPlan(conversation).title).toBe(conversation.title);
    expect(createPdfDocumentPlan(conversation).metadata.exportedAt).toBe(conversation.exportedAt);
  });
});

describe("PDF templates", () => {
  it("generates the default template when no option is supplied", () => {
    const plan = createPdfDocumentPlan(createBasicConversationFixture());
    const result = exportConversationToPdf(createBasicConversationFixture());

    expect(plan.template).toBe("default");
    expect(result.status).toBe("success");
  });

  it("generates the dark template with dark surface styling", () => {
    const plan = createPdfDocumentPlan(createBasicConversationFixture(), "dark");
    const result = exportConversationToPdf(createBasicConversationFixture(), "dark");

    expect(plan.template).toBe("dark");
    expect(result.status).toBe("success");
    if (result.status === "success") expect(hasValidPdfSignature(result.data)).toBe(true);
  });
});
