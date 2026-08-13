import type { Conversation } from "../types/conversation";
import { createMarkdownFilename } from "./markdown-filename";
import { renderConversationMarkdownWithWarnings } from "./markdown-renderer";

export interface MarkdownExportWarning {
  code: string;
  messageId?: string;
}

export type MarkdownExportResult =
  | { status: "success"; markdown: string; filename: string; warnings: MarkdownExportWarning[] }
  | { status: "error"; code: "EMPTY_CONVERSATION" };

export function exportConversationToMarkdown(conversation: Conversation): MarkdownExportResult {
  if (conversation.messages.length === 0) {
    return { status: "error", code: "EMPTY_CONVERSATION" };
  }

  const rendered = renderConversationMarkdownWithWarnings(conversation);
  return {
    status: "success",
    markdown: rendered.markdown,
    filename: createMarkdownFilename(conversation.title),
    warnings: rendered.warnings.map(({ code, messageId }) => ({ code, messageId })),
  };
}
