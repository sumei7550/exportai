import { exportConversationToMarkdown, type MarkdownExportWarning } from "../exporters/markdown-exporter";
import type { MarkdownDownloadRequest } from "../exporters/markdown-download-service";
import type { Conversation } from "../types/conversation";

export type SaveMarkdownFile = (request: MarkdownDownloadRequest) => Promise<void>;

export type PopupMarkdownExportResult =
  | { status: "success"; filename: string; warnings: MarkdownExportWarning[] }
  | { status: "error"; reason: string };

export async function exportMarkdownFromPopup(
  conversation: Conversation,
  saveMarkdownFile: SaveMarkdownFile,
): Promise<PopupMarkdownExportResult> {
  const result = exportConversationToMarkdown(conversation);
  if (result.status === "error") {
    return { status: "error", reason: "This conversation has no messages to export." };
  }

  try {
    await saveMarkdownFile({ markdown: result.markdown, filename: result.filename });
    return { status: "success", filename: result.filename, warnings: result.warnings };
  } catch {
    return { status: "error", reason: "The Markdown file could not be saved. Please try again." };
  }
}
