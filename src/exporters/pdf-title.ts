import type { Block, Conversation, InlineContent } from "../types/conversation";

export const DEFAULT_PDF_TITLE = "Chat Conversation Export";
export const MAX_PDF_TITLE_LENGTH = 120;

export function createPdfTitle(conversation: Conversation): string {
  const candidates = [
    conversation.title,
    ...conversation.messages
      .filter((message) => message.role === "user")
      .map((message) => message.originalText),
    ...conversation.messages.flatMap((message) => findHeadingTexts(message.blocks)),
  ];

  for (const candidate of candidates) {
    const title = normalizePdfTitle(candidate);
    if (title !== "") return title;
  }

  return DEFAULT_PDF_TITLE;
}

function findHeadingTexts(blocks: Block[]): string[] {
  return blocks.flatMap((block) => {
    if (block.type === "heading") return [inlineText(block.content)];
    if (block.type === "quote") return findHeadingTexts(block.blocks);
    return [];
  });
}

function inlineText(content: InlineContent[]): string {
  return content.map((inline) => inline.text).join("");
}

function normalizePdfTitle(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PDF_TITLE_LENGTH)
    .trim();
}
