import { useEffect, useState } from "react";

import { PDF_MIME_TYPE } from "../exporters/pdf-types";

export type PdfPreviewErrorCode = "PDF_PREVIEW_FAILED";

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
}

type PdfPreviewPageState =
  | { status: "loading" }
  | { status: "success"; objectUrl: string }
  | { status: "error"; code: PdfPreviewErrorCode };

/**
 * Minimal PDF Preview page. It deliberately has no download or persistence
 * behavior; Chrome's built-in PDF viewer renders the object URL in the iframe.
 */
export function PdfPreviewPage({ pdfBytes }: PdfPreviewPageProps) {
  const [state, setState] = useState<PdfPreviewPageState>({ status: "loading" });

  useEffect(() => {
    const result = createPdfPreview(pdfBytes);
    if (result.status === "error") {
      setState(result);
      return;
    }

    setState({ status: "success", objectUrl: result.resource.objectUrl });
    return result.resource.cleanup;
  }, [pdfBytes]);

  if (state.status === "loading") {
    return <main aria-live="polite">Preparing PDF preview…</main>;
  }

  if (state.status === "error") {
    return <main role="alert">Unable to preview this PDF.</main>;
  }

  return (
    <main>
      <iframe
        title="PDF preview"
        src={state.objectUrl}
        onError={() => setState({ status: "error", code: "PDF_PREVIEW_FAILED" })}
        style={{ border: 0, height: "100vh", width: "100%" }}
      />
    </main>
  );
}
