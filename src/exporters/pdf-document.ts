import type { Block, Conversation, InlineContent, ListBlock, Message, MessageRole } from "../types/conversation";
import { getSafeMarkdownUrl } from "./markdown-inline-renderer";
import type {
  PdfBlockPlan,
  PdfDocumentMetadata,
  PdfDocumentPlan,
  PdfInlinePlan,
  PdfListBlockPlan,
  PdfListItemPlan,
  PdfMessagePlan,
  PdfExportWarning,
} from "./pdf-types";
import type { PdfTemplateId } from "./pdf-template";

const SUPPORTED_BLOCK_TYPES = new Set<Block["type"]>([
  "paragraph",
  "text",
  "heading",
  "list",
  "code",
  "math",
  "table",
  "image",
  "quote",
  "thematic-break",
  "unknown",
]);

function isSupportedMessageRole(role: MessageRole): role is PdfMessagePlan["role"] {
  return role === "user" || role === "assistant";
}

export function createPdfDocumentPlan(conversation: Conversation, template: PdfTemplateId = "default"): PdfDocumentPlan {
  const metadata: PdfDocumentMetadata = { platform: conversation.platform, exportedAt: conversation.exportedAt };
  if (conversation.model !== undefined) metadata.model = conversation.model;

  const warnings: PdfExportWarning[] = [];
  const messages = [...conversation.messages]
    .sort((left, right) => left.order - right.order)
    .flatMap((message) => {
      if (!isSupportedMessageRole(message.role)) return [];
      const blocks = extractMessageBlocks(message, warnings);
      if (blocks.length === 0) return [];
      return [{ id: message.id, role: message.role, blocks }];
    });

  return {
    title: conversation.title,
    template,
    metadata,
    messages,
    warnings,
  };
}

function extractMessageBlocks(message: Message, warnings: PdfExportWarning[]): PdfBlockPlan[] {
  const blocks = message.blocks
    .map((block) => mapBlock(block, warnings))
    .filter((block): block is PdfBlockPlan => block !== null);

  if (blocks.length > 0) return blocks;

  const fallbackText = message.originalText.trim();
  if (fallbackText.length === 0) return [];
  return [{ type: "paragraph", content: [{ text: fallbackText }] }];
}

function mapBlock(block: Block, warnings: PdfExportWarning[]): PdfBlockPlan | null {
  if (!SUPPORTED_BLOCK_TYPES.has(block.type)) return null;

  switch (block.type) {
    case "text":
    case "paragraph":
      return { type: block.type, content: mapInlineContent(block.content) };
    case "heading":
      return { type: "heading", level: block.level, content: mapInlineContent(block.content) };
    case "code":
      return { type: "code", code: block.code, language: block.language };
    case "math":
      warnings.push({
        code: "MATH_LATEX_SOURCE_FALLBACK",
        message: "Math was rendered as readable LaTeX source text because PDF formula layout is not supported.",
      });
      return { type: "math", text: block.display ? `$$\n${block.latex}\n$$` : `$${block.latex}$` };
    case "list":
      return mapListBlock(block);
    case "table":
      return {
        type: "table",
        headers: block.headers.map(mapInlineContent),
        rows: block.rows.map((row) => row.map(mapInlineContent)),
      };
    case "image":
      if (!isSupportedImageDataUri(block.src)) {
        warnings.push({
          code: "IMAGE_UNSAFE_SOURCE",
          message: "Image source is not a supported local PNG or JPEG data URI; fallback text will be rendered.",
        });
      }
      return { type: "image", src: block.src, alt: block.alt, caption: block.caption };
    case "quote":
      return mapQuoteBlock(block.blocks, warnings);
    case "unknown":
      if (block.rawText.trim().length > 0) {
        warnings.push({
          code: "UNKNOWN_BLOCK_FALLBACK",
          message: "Unsupported content was preserved as fallback text.",
        });
        return { type: "unknown", text: block.rawText.trim() };
      }
      warnings.push({
        code: "UNKNOWN_BLOCK_EMPTY",
        message: "Unsupported content had no readable text; a placeholder was rendered.",
      });
      return { type: "unknown", text: "[Unsupported content]" };
    case "thematic-break":
      return { type: "thematic-break" };
    default:
      return null;
  }
}

function mapQuoteBlock(blocks: Block[], warnings: PdfExportWarning[]): PdfBlockPlan {
  const mappedBlocks = blocks
    .map((block) => mapBlock(block, warnings))
    .filter((block): block is PdfBlockPlan => block !== null);

  if (mappedBlocks.length > 0) {
    return { type: "quote", blocks: mappedBlocks };
  }

  return { type: "quote", blocks: [] };
}

function isSupportedImageDataUri(src: string): boolean {
  return /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/i.test(src);
}

function mapListBlock(list: ListBlock): PdfBlockPlan {
  return {
    type: "list",
    ordered: list.ordered,
    items: list.items.map(mapListItem),
  };
}

function mapListItem(item: ListBlock["items"][number]): PdfListItemPlan {
  const mapped: PdfListItemPlan = { content: mapInlineContent(item.content) };
  if (item.children !== undefined) {
    mapped.children = mapNestedListBlock(item.children);
  }
  return mapped;
}

function mapNestedListBlock(list: ListBlock): PdfListBlockPlan {
  return {
    ordered: list.ordered,
    items: list.items.map(mapListItem),
  };
}

function mapInlineContent(content: InlineContent[]): PdfInlinePlan[] {
  return content.map(mapInline);
}

function mapInline(inline: InlineContent): PdfInlinePlan {
  const mapped: PdfInlinePlan = {
    text: inline.text,
    bold: inline.bold,
    italic: inline.italic,
    strikethrough: inline.strikethrough,
    code: inline.code,
  };

  if ("href" in inline) {
    const safeUrl = getSafeMarkdownUrl(inline.href);
    if (safeUrl !== null) mapped.href = safeUrl;
  }

  return mapped;
}
