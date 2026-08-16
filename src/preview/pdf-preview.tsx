import { useEffect, useState } from "react";

import { savePdfFile } from "../exporters/pdf-download-service";
import { PDF_MIME_TYPE } from "../exporters/pdf-types";

export type PdfPreviewErrorCode = "PDF_PREVIEW_FAILED";
export type PdfPreviewDownloadErrorCode = "PDF_DOWNLOAD_FAILED";

export type PdfPreviewResource = {
  blob: Blob;
  objectUrl: string;
  cleanup: () => void;
};

export type PdfPreviewCreationResult =
  | { status: "success"; resource: PdfPreviewResource }
  | { status: "error"; code: PdfPreviewErrorCode };

/** Converts PDF Core bytes into the browser-native PDF Blob consumed by Preview. */
export function createPdfPreviewBlob(pdfBytes: Uint8Array): Blob {
  // Copy into an ArrayBuffer-backed view so BlobPart remains compatible with
  // TypeScript's SharedArrayBuffer-aware Uint8Array definition.
  const bytes = new Uint8Array(pdfBytes.byteLength);
  bytes.set(pdfBytes);
  return new Blob([bytes.buffer], { type: PDF_MIME_TYPE });
}

/** Creates an object URL and owns its revocation until cleanup is called. */
export function createPdfPreviewResource(pdfBytes: Uint8Array): PdfPreviewResource {
  const blob = createPdfPreviewBlob(pdfBytes);
  const objectUrl = URL.createObjectURL(blob);
  let isCleanedUp = false;

  return {
    blob,
    objectUrl,
    cleanup: () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      URL.revokeObjectURL(objectUrl);
    },
  };
}

export function createPdfPreview(pdfBytes: Uint8Array): PdfPreviewCreationResult {
  try {
    return { status: "success", resource: createPdfPreviewResource(pdfBytes) };
  } catch {
    return { status: "error", code: "PDF_PREVIEW_FAILED" };
  }
}

export interface PdfPreviewPageProps {
  pdfBytes: Uint8Array;
  filename: string;
  resource?: PdfPreviewResource;
  download?: PdfDownloadFunction;
}

type PdfPreviewPageState =
  | { status: "loading" }
  | { status: "ready"; objectUrl: string }
  | { status: "downloading"; objectUrl: string }
  | { status: "success"; objectUrl: string }
  | { status: "error"; objectUrl?: string; code: PdfPreviewErrorCode | PdfPreviewDownloadErrorCode };

export type PdfDownloadFunction = (request: { pdfBytes: Uint8Array; filename: string }) => Promise<void>;

/**
 * PDF Preview page. Preview owns confirmation and state, while Download Service
 * owns the browser-specific local save operation.
 */
export function PdfPreviewPage({ pdfBytes, filename, resource, download = savePdfFile }: PdfPreviewPageProps) {
  const [state, setState] = useState<PdfPreviewPageState>({ status: "loading" });

  useEffect(() => {
    setState({ status: "loading" });
    const result = resource ? { status: "success" as const, resource } : createPdfPreview(pdfBytes);
    if (result.status === "error") {
      setState(result);
      return;
    }

    setState({ status: "ready", objectUrl: result.resource.objectUrl });
    return result.resource.cleanup;
  }, [pdfBytes, resource]);

  async function handleDownload() {
    if (state.status !== "ready" && state.status !== "success") return;

    setState({ status: "downloading", objectUrl: state.objectUrl });
    try {
      await download({ pdfBytes, filename });
      setState({ status: "success", objectUrl: state.objectUrl });
    } catch {
      setState({ status: "error", objectUrl: state.objectUrl, code: "PDF_DOWNLOAD_FAILED" });
    }
  }

  if (state.status === "loading") {
    return <main aria-live="polite">Preparing PDF preview…</main>;
  }

  if (state.status === "error") {
    return (
      <main role="alert">
        {state.code === "PDF_PREVIEW_FAILED" ? "Unable to preview this PDF." : "Unable to download this PDF."}
      </main>
    );
  }

  return (
    <main>
      <button type="button" onClick={() => void handleDownload()} disabled={state.status === "downloading"}>
        {state.status === "downloading" ? "Downloading PDF…" : state.status === "success" ? "Download PDF again" : "Download PDF"}
      </button>
      {state.status === "success" && <p role="status">PDF download started: {filename}</p>}
      <iframe
        title="PDF preview"
        src={state.objectUrl}
        onError={() => setState({ status: "error", objectUrl: state.objectUrl, code: "PDF_PREVIEW_FAILED" })}
        style={{ border: 0, height: "100vh", width: "100%" }}
      />
    </main>
  );
}
