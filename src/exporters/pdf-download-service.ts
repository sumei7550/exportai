import { PDF_MIME_TYPE } from "./pdf-types";

export interface PdfDownloadRequest {
  pdfBytes: Uint8Array;
  filename: string;
}

/** Converts PDF Core bytes into the browser-native Blob used for downloading. */
export function createPdfDownloadBlob(pdfBytes: Uint8Array): Blob {
  // Use an ArrayBuffer-backed copy so this remains compatible with the
  // SharedArrayBuffer-aware Uint8Array definition used by TypeScript.
  const bytes = new Uint8Array(pdfBytes.byteLength);
  bytes.set(pdfBytes);
  return new Blob([bytes.buffer], { type: PDF_MIME_TYPE });
}

/** Starts a local PDF download and releases all temporary browser resources. */
export async function savePdfFile({ pdfBytes, filename }: PdfDownloadRequest): Promise<void> {
  const blob = createPdfDownloadBlob(pdfBytes);
  const objectUrl = URL.createObjectURL(blob);
  let anchor: HTMLAnchorElement | undefined;

  try {
    anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor?.remove();
    URL.revokeObjectURL(objectUrl);
  }
}
