// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPdfPreview,
  createPdfPreviewBlob,
  createPdfPreviewResource,
} from "../preview/pdf-preview";

afterEach(() => {
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
});
