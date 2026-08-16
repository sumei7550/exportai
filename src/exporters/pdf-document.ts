import type { Block, Conversation, InlineContent, Message, MessageRole } from "../types/conversation";
import type { PdfDocumentMetadata, PdfDocumentPlan, PdfMessagePlan } from "./pdf-types";

const SUPPORTED_BLOCK_TYPES = new Set<Block["type"]>(["paragraph", "text"]);

function isSupportedMessageRole(role: MessageRole): role is PdfMessagePlan["role"] {
  return role === "user" || role === "assistant";
}

export function createPdfDocumentPlan(conversation: Conversation): PdfDocumentPlan {
  const metadata: PdfDocumentMetadata = { platform: conversation.platform };
  if (conversation.model !== undefined) metadata.model = conversation.model;

  const messages = [...conversation.messages]
    .sort((left, right) => left.order - right.order)
    .flatMap((message) => {
      if (!isSupportedMessageRole(message.role)) return [];
      const text = extractMessageText(message);
      if (text.length === 0) return [];
      return [{ role: message.role, text }];
    });

  return {
    title: conversation.title,
    metadata,
    messages,
  };
}

function extractMessageText(message: Message): string {
  const blockTexts = message.blocks
    .filter((block): block is Extract<Block, { type: "paragraph" | "text" }> => SUPPORTED_BLOCK_TYPES.has(block.type))
    .map(extractInlineText)
    .filter((text) => text.length > 0);

  if (blockTexts.length > 0) return blockTexts.join("\n\n");
  return message.originalText.trim();
}

function extractInlineText(block: Extract<Block, { type: "paragraph" | "text" }>): string {
  return block.content.map(inlineText).join("");
}

function inlineText(content: InlineContent): string {
  return content.text;
}
