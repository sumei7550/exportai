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
  PdfRenderWarning,
} from "./pdf-types";

const SUPPORTED_BLOCK_TYPES = new Set<Block["type"]>([
  "paragraph",
  "text",
  "heading",
  "list",
  "code",
  "table",
  "image",
  "quote",
  "thematic-break",
]);

function isSupportedMessageRole(role: MessageRole): role is PdfMessagePlan["role"] {
  return role === "user" || role === "assistant";
}

export function createPdfDocumentPlan(conversation: Conversation): PdfDocumentPlan {
  const metadata: PdfDocumentMetadata = { platform: conversation.platform };
  if (conversation.model !== undefined) metadata.model = conversation.model;

  const warnings: PdfRenderWarning[] = [];
  const messages = [...conversation.messages]
    .sort((left, right) => left.order - right.order)
    .flatMap((message) => {
      if (!isSupportedMessageRole(message.role)) return [];
      const blocks = extractMessageBlocks(message, warnings);
      if (blocks.length === 0) return [];
      return [{ role: message.role, blocks }];
    });

  return {
    title: conversation.title,
    metadata,
    messages,
    warnings,
  };
}

function extractMessageBlocks(message: Message, warnings: PdfRenderWarning[]): PdfBlockPlan[] {
  const blocks = message.blocks
    .map((block) => mapBlock(block, warnings))
    .filter((block): block is PdfBlockPlan => block !== null);

  if (blocks.length > 0) return blocks;

  const fallbackText = message.originalText.trim();
  if (fallbackText.length === 0) return [];
  return [{ type: "paragraph", content: [{ text: fallbackText }] }];
}

function mapBlock(block: Block, warnings: PdfRenderWarning[]): PdfBlockPlan | null {
  if (!SUPPORTED_BLOCK_TYPES.has(block.type)) return null;

  switch (block.type) {
    case "text":
    case "paragraph":
      return { type: block.type, content: mapInlineContent(block.content) };
    case "heading":
      return { type: "heading", level: block.level, content: mapInlineContent(block.content) };
    case "code":
      return { type: "code", code: block.code, language: block.language };
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
    case "thematic-break":
      return { type: "thematic-break" };
    default:
      return null;
  }
}

function mapQuoteBlock(blocks: Block[], warnings: PdfRenderWarning[]): PdfBlockPlan {
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
