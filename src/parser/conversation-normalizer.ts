import { CONVERSATION_MODEL_VERSION, type Block, type Conversation, type InlineContent, type Message, type ParseWarning } from "../types/conversation";

export interface ValidationResult { conversation: Conversation; warnings: ParseWarning[]; }

function normalizeInlineContent(content: InlineContent[]): InlineContent[] {
  return content.map((item) => ({ ...item, text: item.text.replace(/\r\n/g, "\n") }));
}

function normalizeBlock(block: Block): Block {
  switch (block.type) {
    case "text": case "paragraph": case "heading": case "link":
      return { ...block, content: normalizeInlineContent(block.content) };
    case "list":
      return { ...block, items: block.items.map((item) => ({ ...item, content: normalizeInlineContent(item.content), children: item.children ? (normalizeBlock(item.children) as typeof item.children) : undefined })) };
    case "table":
      return { ...block, headers: block.headers.map(normalizeInlineContent), rows: block.rows.map((row) => row.map(normalizeInlineContent)) };
    case "quote": return { ...block, blocks: block.blocks.map(normalizeBlock) };
    default: return block;
  }
}

function normalizeMessage(message: Message, expectedOrder: number, warnings: ParseWarning[]): Message {
  if (message.order !== expectedOrder) warnings.push({ code: "message-order-normalized", message: `Message order was normalized to ${expectedOrder}.`, messageId: message.id });
  const blocks = message.blocks.map(normalizeBlock);
  if (blocks.length > 0) return { ...message, order: expectedOrder, blocks };
  warnings.push({ code: "empty-message-blocks", message: "A message had no structured blocks and was preserved as a paragraph.", messageId: message.id });
  return { ...message, order: expectedOrder, blocks: [{ id: `${message.id}-fallback`, type: "paragraph", content: [{ text: message.originalText }] }], metadata: { ...message.metadata, isPartial: true } };
}

export function normalizeConversation(conversation: Conversation): ValidationResult {
  const warnings = [...conversation.metadata.parseWarnings];
  const seenIds = new Set<string>();
  const messages = conversation.messages.map((message, index) => {
    if (seenIds.has(message.id)) warnings.push({ code: "duplicate-message-id", message: "A duplicate message ID was found.", messageId: message.id });
    seenIds.add(message.id);
    return normalizeMessage(message, index, warnings);
  });
  return { conversation: { ...conversation, title: conversation.title.trim() || "Untitled conversation", messages, metadata: { ...conversation.metadata, messageCount: messages.length, isComplete: warnings.length === 0 && conversation.metadata.isComplete, parseWarnings: warnings, modelVersion: CONVERSATION_MODEL_VERSION } }, warnings };
}