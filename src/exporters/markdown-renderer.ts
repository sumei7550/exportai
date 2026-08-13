import type { Conversation, Message, MessageRole } from "../types/conversation";
import { renderBlocksMarkdown, type MarkdownRenderWarning } from "./markdown-block-renderer";

const ROLE_LABELS: Record<MessageRole, string> = {
  user: "User",
  assistant: "Assistant",
  system: "System",
  unknown: "Unknown",
};

const EMPTY_MESSAGE_CONTENT = "_No readable content._";

export interface MarkdownConversationRenderWarning extends MarkdownRenderWarning {
  messageId: string;
}

export interface MarkdownConversationRenderResult {
  markdown: string;
  warnings: MarkdownConversationRenderWarning[];
}

export function renderConversationMarkdown(conversation: Conversation): string {
  return renderConversationMarkdownWithWarnings(conversation).markdown;
}

export function renderConversationMarkdownWithWarnings(conversation: Conversation): MarkdownConversationRenderResult {
  const messages = [...conversation.messages].sort((left, right) => left.order - right.order);
  const renderedMessages = messages.map(renderMessageMarkdownWithWarnings);

  return {
    markdown: [`# ${conversation.title.trim() || "Untitled conversation"}`, ...renderedMessages.map((result) => result.markdown)].join("\n\n").concat("\n"),
    warnings: renderedMessages.flatMap((result) => result.warnings),
  };
}

export function renderMessageMarkdown(message: Message): string {
  return renderMessageMarkdownWithWarnings(message).markdown;
}

function renderMessageMarkdownWithWarnings(message: Message): { markdown: string; warnings: MarkdownConversationRenderWarning[] } {
  const blockResult = message.blocks.length > 0 ? renderBlocksMarkdown(message.blocks) : { markdown: "", warnings: [] };
  const messageContent = blockResult.markdown || normalizeMessageText(message.originalText) || EMPTY_MESSAGE_CONTENT;
  const partialNote = message.metadata.isPartial ? "> Export note: this message may be incomplete.\n\n" : "";

  return {
    markdown: `## ${ROLE_LABELS[message.role]}\n\n${partialNote}${messageContent}`,
    warnings: blockResult.warnings.map((warning) => ({ ...warning, messageId: message.id })),
  };
}

function normalizeMessageText(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}
