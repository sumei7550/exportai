import { describe, expect, it, vi } from "vitest";
import { exportPdfFromPopup } from "../popup/pdf-export-action";
import type { Conversation } from "../types/conversation";

const conversation = {} as Conversation;
const preview = {
  blob: new Blob(["%PDF-1.7"]),
  objectUrl: "blob:exportai-pdf-preview",
  cleanup: vi.fn(),
};

describe("Popup PDF export action", () => {
  it("returns PDF bytes and a Preview resource on success", async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const exportPdf = vi.fn(() => ({
      status: "success" as const,
      data: pdfBytes,
      filename: "ExportAI conversation.pdf",
      mimeType: "application/pdf" as const,
      warnings: [],
    }));
    const createPreview = vi.fn(() => ({ status: "success" as const, resource: preview }));

    await expect(exportPdfFromPopup(conversation, exportPdf, createPreview)).resolves.toEqual({
      status: "success",
      filename: "ExportAI conversation.pdf",
      pdfBytes,
      preview,
    });
    expect(createPreview).toHaveBeenCalledWith(pdfBytes);
  });

  it.each([
    "EMPTY_CONVERSATION",
    "INVALID_CONVERSATION",
  ] as const)("returns the exporter %s error without entering Preview", async (code) => {
    const createPreview = vi.fn();
    const result = await exportPdfFromPopup(
      conversation,
      vi.fn(() => ({ status: "error" as const, code })),
      createPreview,
    );

    expect(result).toEqual({ status: "error", code });
    expect(createPreview).not.toHaveBeenCalled();
  });

  it("maps exporter exceptions to PDF_GENERATION_FAILED", async () => {
    await expect(exportPdfFromPopup(conversation, vi.fn(() => { throw new Error("engine failed"); })))
      .resolves.toEqual({ status: "error", code: "PDF_GENERATION_FAILED" });
  });

  it("maps Preview failures to PDF_PREVIEW_FAILED", async () => {
    const result = await exportPdfFromPopup(
      conversation,
      vi.fn(() => ({
        status: "success" as const,
        data: new Uint8Array([1]),
        filename: "exportai.pdf",
        mimeType: "application/pdf" as const,
        warnings: [],
      })),
      vi.fn(() => ({ status: "error" as const, code: "PDF_PREVIEW_FAILED" as const })),
    );

    expect(result).toEqual({ status: "error", code: "PDF_PREVIEW_FAILED" });
  });
});
