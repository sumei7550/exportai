import type { Conversation } from "../types/conversation";
import { createPdfDocumentPlan } from "./pdf-document";
import { renderPdfDocumentPlan } from "./pdf-engine";
import { createPdfFilename } from "./pdf-filename";
import type { PdfExportResult } from "./pdf-types";
import { PDF_MIME_TYPE } from "./pdf-types";
import { isValidJsonConversation } from "./json-validator";

export type { PdfExportErrorCode, PdfExportResult } from "./pdf-types";

export function exportConversationToPdf(conversation: Conversation): PdfExportResult {
  try {
    if (Array.isArray(conversation.messages) && conversation.messages.length === 0) {
      return { status: "error", code: "EMPTY_CONVERSATION" };
    }
    if (!isValidJsonConversation(conversation)) {
      return { status: "error", code: "INVALID_CONVERSATION" };
    }
  } catch {
    return { status: "error", code: "INVALID_CONVERSATION" };
  }

  try {
    const plan = createPdfDocumentPlan(conversation);
    const rendered = renderPdfDocumentPlan(plan);
    if (!rendered.hasValidSignature) {
      return { status: "error", code: "PDF_GENERATION_FAILED" };
    }

    return {
      status: "success",
      data: rendered.data,
      filename: createPdfFilename(conversation.title),
      mimeType: PDF_MIME_TYPE,
      warnings: rendered.warnings,
    };
  } catch {
    return { status: "error", code: "PDF_GENERATION_FAILED" };
  }
}
