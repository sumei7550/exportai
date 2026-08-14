import { describe, expect, it } from "vitest";
import { exportConversationToMarkdown } from "../exporters/markdown-exporter";
import { createMarkdownFilename } from "../exporters/markdown-filename";
import { renderConversationMarkdown } from "../exporters/markdown-renderer";
import { createConversationFixture } from "./fixtures/conversation.fixture";

describe("Markdown Exporter Core", () => {
  it("renders a unified conversation title, ordered role headings, and message text", () => {
    const conversation = createConversationFixture();
    conversation.messages = conversation.messages.map((message) => ({ ...message, blocks: [] }));
    conversation.messages[0] = { ...conversation.messages[0], order: 2 };
    conversation.messages[1] = { ...conversation.messages[1], order: 0 };
    conversation.messages[2] = { ...conversation.messages[2], order: 1 };

    expect(renderConversationMarkdown(conversation)).toBe(
      "# ExportAI fixture\n\n## Assistant\n\nA list may contain another list.\n\n## Assistant\n\nComplete block coverage.\n\n## User\n\nExplain a nested list.\n",
    );
  });

  it("returns Markdown and a safe filename without inspecting platform-specific data", () => {
    const conversation = createConversationFixture();
    conversation.platform = "gemini";
    conversation.title = "涓枃 conversation: <draft>?";

    expect(exportConversationToMarkdown(conversation)).toMatchObject({
      status: "success",
      filename: "涓枃 conversation- -draft-.md",
      warnings: [{ code: "UNKNOWN_BLOCK_FALLBACK", messageId: "message-assistant-002" }],
    });
  });

  it("preserves an empty user message as readable fallback content", () => {
    const conversation = createConversationFixture();
    conversation.messages = [{ ...conversation.messages[0], originalText: "", blocks: [] }];

    expect(renderConversationMarkdown(conversation)).toContain("## User\n\n_No readable content._");
  });

  it("preserves an empty assistant message as readable fallback content", () => {
    const conversation = createConversationFixture();
    conversation.messages = [{ ...conversation.messages[1], originalText: "", blocks: [] }];

    expect(renderConversationMarkdown(conversation)).toContain("## Assistant\n\n_No readable content._");
  });

  it("keeps empty messages in order among readable messages", () => {
    const conversation = createConversationFixture();
    conversation.messages = [
      { ...conversation.messages[0], originalText: "First readable message.", blocks: [] },
      { ...conversation.messages[1], originalText: "", blocks: [] },
      { ...conversation.messages[2], originalText: "Last readable message.", blocks: [] },
    ];

    expect(renderConversationMarkdown(conversation)).toContain(
      "## User\n\nFirst readable message.\n\n## Assistant\n\n_No readable content._\n\n## Assistant\n\nLast readable message.",
    );
  });

  it("does not treat an image-only message as empty", () => {
    const conversation = createConversationFixture();
    conversation.messages = [{
      ...conversation.messages[1],
      originalText: "",
      blocks: [{ id: "image-only", type: "image", src: "https://example.test/image.png", alt: "Diagram" }],
    }];

    const markdown = renderConversationMarkdown(conversation);
    expect(markdown).toContain("## Assistant\n\n![Diagram](<https://example.test/image.png>)");
    expect(markdown).not.toContain("_No readable content._");
  });

  it("marks partial messages without dropping their content", () => {
    const conversation = createConversationFixture();
    conversation.messages = [{ ...conversation.messages[0], metadata: { isPartial: true } }];

    expect(renderConversationMarkdown(conversation)).toContain("> Export note: this message may be incomplete.\n\nExplain a nested list.");
  });

  it("rejects an empty conversation instead of producing an empty file", () => {
    const conversation = createConversationFixture();
    conversation.messages = [];

    expect(exportConversationToMarkdown(conversation)).toEqual({ status: "error", code: "EMPTY_CONVERSATION" });
  });
});

describe("Markdown filename", () => {
  it("keeps Unicode while removing unsafe filename characters", () => {
    expect(createMarkdownFilename("鎶ュ憡 / 2026: Q1")).toBe("鎶ュ憡 - 2026- Q1.md");
  });

  it("uses a safe fallback for blank and reserved filenames", () => {
    expect(createMarkdownFilename("   ")).toBe("untitled-conversation.md");
    expect(createMarkdownFilename("CON")).toBe("CON-conversation.md");
  });
});

import { renderBlockMarkdown, renderBlocksMarkdown } from "../exporters/markdown-block-renderer";

describe("Markdown Block Renderer", () => {
  it("renders text, paragraph, and headings", () => {
    expect(renderBlocksMarkdown([
      { id: "text", type: "text", content: [{ text: "Plain" }] },
      { id: "paragraph", type: "paragraph", content: [{ text: "Paragraph" }] },
      { id: "heading", type: "heading", level: 3, content: [{ text: "Heading" }] },
    ]).markdown).toBe("Plain\n\nParagraph\n\n### Heading");
  });

  it("renders nested ordered and unordered lists", () => {
    expect(renderBlockMarkdown({ id: "list", type: "list", ordered: true, items: [{ id: "one", content: [{ text: "One" }], children: { id: "child", type: "list", ordered: false, items: [{ id: "child-one", content: [{ text: "Child" }] }] } }] }).markdown).toBe("1. One\n  - Child");
  });

  it("uses a fence longer than backticks inside a code block", () => {
    expect(renderBlockMarkdown({ id: "code", type: "code", language: "ts", code: "const ticks = ```;" }).markdown).toBe("````ts\nconst ticks = ```;\n````");
  });

  it("renders GFM tables while preserving cell pipes and line breaks", () => {
    expect(renderBlockMarkdown({ id: "table", type: "table", headers: [[{ text: "Name|Type" }], [{ text: "Value" }]], rows: [[[{ text: "First\nSecond" }], [{ text: "OK" }]]] }).markdown).toBe("| Name\\|Type | Value |\n| --- | --- |\n| First<br>Second | OK |");
  });

  it("preserves inline and display LaTeX", () => {
    expect(renderBlockMarkdown({ id: "inline-math", type: "math", latex: "x^2", display: false }).markdown).toBe("$x^2$");
    expect(renderBlockMarkdown({ id: "display-math", type: "math", latex: "E = mc^2", display: true }).markdown).toBe("$$\nE = mc^2\n$$");
  });

  it("renders images and links only with safe URLs", () => {
    expect(renderBlockMarkdown({ id: "image", type: "image", src: "https://example.test/image.png", alt: "Chart", caption: "A chart" }).markdown).toBe("![Chart](<https://example.test/image.png> \"A chart\")");
    expect(renderBlockMarkdown({ id: "link", type: "link", href: "https://example.test/reference", content: [{ text: "Reference" }] }).markdown).toBe("[Reference](<https://example.test/reference>)");
    expect(renderBlockMarkdown({ id: "unsafe", type: "link", href: "javascript:alert(1)", content: [{ text: "Unsafe" }] })).toEqual({ markdown: "Unsafe", warnings: [{ code: "UNSAFE_URL_FALLBACK", blockId: "unsafe" }] });
  });

  it("preserves a descriptive image alt", () => {
    expect(renderBlockMarkdown({ id: "image", type: "image", src: "https://example.test/image.png", alt: "Architecture diagram" }).markdown)
      .toBe("![Architecture diagram](<https://example.test/image.png>)");
  });

  it("replaces a UUID image filename alt", () => {
    expect(renderBlockMarkdown({ id: "image", type: "image", src: "https://example.test/image.png", alt: "a048683c-f186-4826-a447-867fa46f572f.png" }).markdown)
      .toBe("![Image](<https://example.test/image.png>)");
  });

  it("uses a fallback for an empty image alt", () => {
    expect(renderBlockMarkdown({ id: "image", type: "image", src: "https://example.test/image.png", alt: "  " }).markdown)
      .toBe("![Image](<https://example.test/image.png>)");
  });

  it("preserves a normal image filename alt", () => {
    expect(renderBlockMarkdown({ id: "image", type: "image", src: "https://example.test/image.png", alt: "quarterly-report.png" }).markdown)
      .toBe("![quarterly\\-report.png](<https://example.test/image.png>)");
  });

  it("renders quotes and thematic breaks", () => {
    expect(renderBlocksMarkdown([
      { id: "quote", type: "quote", blocks: [{ id: "quoted", type: "paragraph", content: [{ text: "Quoted" }] }] },
      { id: "break", type: "thematic-break" },
    ]).markdown).toBe("> Quoted\n\n---");
  });

  it("retains unknown block fallback text and reports a warning", () => {
    expect(renderBlockMarkdown({ id: "unknown", type: "unknown", rawText: "Raw fallback" })).toEqual({ markdown: "Raw fallback", warnings: [{ code: "UNKNOWN_BLOCK_FALLBACK", blockId: "unknown" }] });
  });

  it("escapes inline Markdown and renders inline code and links", () => {
    expect(renderBlockMarkdown({ id: "inline", type: "paragraph", content: [
      { text: "*bold*", bold: true }, { text: " " }, { text: "italic", italic: true }, { text: " " }, { text: "gone", strikethrough: true }, { text: " " }, { text: "`x`", code: true }, { text: " docs", href: "https://example.test/docs" },
    ] }).markdown).toBe("**\\*bold\\*** *italic* ~~gone~~ `` `x` ``[ docs](<https://example.test/docs>)");
  });

  it("uses structured blocks in a mixed-content conversation instead of stale originalText", () => {
    const fixture = createConversationFixture();
    const blocks = [
      { id: "paragraph", type: "paragraph" as const, content: [{ text: "Intro" }] },
      { id: "heading", type: "heading" as const, level: 2 as const, content: [{ text: "Details" }] },
      { id: "code", type: "code" as const, code: "const ready = true;", language: "ts" },
      { id: "table", type: "table" as const, headers: [[{ text: "Key" }]], rows: [[[{ text: "Value" }]]] },
      { id: "math", type: "math" as const, latex: "x", display: false },
      { id: "image", type: "image" as const, src: "https://example.test/chart.png", alt: "Chart" },
      { id: "link", type: "link" as const, href: "https://example.test", content: [{ text: "Reference" }] },
      { id: "quote", type: "quote" as const, blocks: [{ id: "quoted", type: "paragraph" as const, content: [{ text: "Quoted" }] }] },
    ];
    fixture.messages = [{ ...fixture.messages[0], originalText: "stale fallback", blocks }];

    expect(renderConversationMarkdown(fixture)).toContain("Intro\n\n## Details\n\n```ts");
  });

  it("keeps every block from long content in order", () => {
    const blocks = Array.from({ length: 500 }, (_, index) => ({ id: `paragraph-${index}`, type: "paragraph" as const, content: [{ text: `Message ${index}` }] }));
    const rendered = renderBlocksMarkdown(blocks).markdown;
    expect(rendered.indexOf("Message 0")).toBeLessThan(rendered.indexOf("Message 499"));
  });
});
