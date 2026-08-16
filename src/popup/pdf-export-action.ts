import { createPdfPreview, type PdfPreviewResource } from "../preview/pdf-preview";
import { exportConversationToPdf } from "../exporters/pdf-exporter";
import type { PdfExportErrorCode } from "../exporters/pdf-types";
import type { Conversation } from "../types/conversation";
import type { PdfTemplateId } from "../exporters/pdf-template";

export type PopupPdfExportErrorCode = PdfExportErrorCode | "PDF_PREVIEW_FAILED";

export type PopupPdfExportResult =
  | { status: "success"; filename: string; pdfBytes: Uint8Array; preview: PdfPreviewResource }
  | { status: "error"; code: PopupPdfExportErrorCode };

export type PdfExporter = (conversation: Conversation, template?: PdfTemplateId) => ReturnType<typeof exportConversationToPdf>;
export type PdfPreviewCreator = (pdfBytes: Uint8Array) => ReturnType<typeof createPdfPreview>;

/** Orchestrates PDF Core and Preview Core for the Popup without reading page DOM. */
export async function exportPdfFromPopup(
  conversation: Conversation,
  exportPdf: PdfExporter = exportConversationToPdf,
  createPreview: PdfPreviewCreator = createPdfPreview,
  template: PdfTemplateId = "default",
): Promise<PopupPdfExportResult> {
  let exportResult: ReturnType<PdfExporter>;
  try {
    exportResult = exportPdf(conversation, template);
  } catch {
    return { status: "error", code: "PDF_GENERATION_FAILED" };
  }

  if (exportResult.status === "error") {
    return { status: "error", code: exportResult.code };
  }

  try {
    const previewResult = createPreview(exportResult.data);
    if (previewResult.status === "error") {
      return { status: "error", code: "PDF_PREVIEW_FAILED" };
    }

    return {
      status: "success",
      filename: exportResult.filename,
      pdfBytes: exportResult.data,
      preview: previewResult.resource,
    };
  } catch {
    return { status: "error", code: "PDF_PREVIEW_FAILED" };
  }
}
