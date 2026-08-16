// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  createPdfPreview,
  createPdfPreviewBlob,
  createPdfPreviewResource,
  PdfPreviewPage,
} from "../preview/pdf-preview";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("PDF Preview Flow", () => {
  it("converts PDF bytes into an application/pdf Blob", async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

    const blob = createPdfPreviewBlob(bytes);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    await expect(blob.arrayBuffer()).resolves.toEqual(bytes.buffer);
  });

  it("creates a Blob URL for the PDF bytes", () => {
    const createObjectURL = vi.fn(() => "blob:exportai-preview");
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });

    const resource = createPdfPreviewResource(new Uint8Array([1, 2, 3]));

    expect(resource.objectUrl).toBe("blob:exportai-preview");
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it("revokes the object URL when cleanup runs, only once", () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:exportai-preview-cleanup"),
      revokeObjectURL,
    });

    const resource = createPdfPreviewResource(new Uint8Array([1]));
    resource.cleanup();
    resource.cleanup();

    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:exportai-preview-cleanup");
  });

  it("returns a successful preview resource", () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:exportai-preview-success"),
      revokeObjectURL: vi.fn(),
    });

    const result = createPdfPreview(new Uint8Array([1, 2]));

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.resource.objectUrl).toBe("blob:exportai-preview-success");
      result.resource.cleanup();
    }
  });

  it("returns a safe error when the browser cannot create an object URL", () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => {
        throw new Error("object URL unavailable");
      }),
      revokeObjectURL: vi.fn(),
    });

    expect(createPdfPreview(new Uint8Array([1]))).toEqual({
      status: "error",
      code: "PDF_PREVIEW_FAILED",
    });
  });

  it("shows the download entry and calls the existing Download Service", async () => {
    let resolveDownload: (() => void) | undefined;
    const download = vi.fn(() => new Promise<void>((resolve) => {
      resolveDownload = resolve;
    }));
    const resource = {
      blob: new Blob(["%PDF-1.7"]),
      objectUrl: "blob:preview-flow",
      cleanup: vi.fn(),
    };
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(createElement(PdfPreviewPage, { pdfBytes: new Uint8Array([1, 2]), filename: "conversation.pdf", resource, download }));
    });

    const button = container.querySelector("button");
    expect(button?.textContent).toBe("Download PDF");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(download).toHaveBeenCalledWith({ pdfBytes: new Uint8Array([1, 2]), filename: "conversation.pdf", template: "default" });
    expect(button?.textContent).toBe("Downloading PDF…");

    await act(async () => {
      resolveDownload?.();
      await Promise.resolve();
    });

    expect(container.querySelector('[role="status"]')?.textContent).toBe("PDF download started: conversation.pdf");
  });

  it("uses the selected template for both preview and download", async () => {
    const download = vi.fn().mockResolvedValue(undefined);
    const resource = { blob: new Blob(["%PDF-1.7"]), objectUrl: "blob:dark", cleanup: vi.fn() };
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(createElement(PdfPreviewPage, {
        pdfBytes: new Uint8Array([1]), filename: "dark.pdf", resource, template: "dark", download,
      }));
    });
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe("blob:dark");

    await act(async () => {
      container.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(download).toHaveBeenCalledWith({ pdfBytes: new Uint8Array([1]), filename: "dark.pdf", template: "dark" });
  });

  it("reports download failures and cleans the preview resource on unmount", async () => {
    const download = vi.fn().mockRejectedValue(new Error("download blocked"));
    const resource = {
      blob: new Blob(["%PDF-1.7"]),
      objectUrl: "blob:preview-failure",
      cleanup: vi.fn(),
    };
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(createElement(PdfPreviewPage, { pdfBytes: new Uint8Array([1]), filename: "conversation.pdf", resource, download }));
    });
    await act(async () => {
      container.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Unable to download this PDF.");
    await act(async () => root?.unmount());
    expect(resource.cleanup).toHaveBeenCalledOnce();
  });
});
