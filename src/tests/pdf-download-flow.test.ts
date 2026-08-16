// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { createPdfDownloadBlob, savePdfFile } from "../exporters/pdf-download-service";

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("PDF Download Flow", () => {
  it("creates an application/pdf Blob without changing the PDF bytes", async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

    const blob = createPdfDownloadBlob(pdfBytes);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    await expect(blob.arrayBuffer()).resolves.toEqual(pdfBytes.buffer);
  });

  it("uses the supplied PDF filename and triggers a local download", async () => {
    const createObjectURL = vi.fn(() => "blob:exportai-pdf-download");
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.href).toBe("blob:exportai-pdf-download");
      expect(this.download).toBe("导出 🚀.pdf");
    });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    await savePdfFile({ pdfBytes: new Uint8Array([1, 2, 3]), filename: "导出 🚀.pdf" });

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download="导出 🚀.pdf"]')).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:exportai-pdf-download");
  });

  it("cleans the anchor and object URL when the browser rejects the trigger", async () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:exportai-pdf-failure"),
      revokeObjectURL,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("browser blocked download");
    });

    await expect(savePdfFile({ pdfBytes: new Uint8Array([1]), filename: "exportai.pdf" })).rejects.toThrow(
      "browser blocked download",
    );

    expect(document.querySelector("a[download]")).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:exportai-pdf-failure");
  });

  it("cleans the object URL when anchor creation fails", async () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:exportai-anchor-failure"),
      revokeObjectURL,
    });
    vi.spyOn(document, "createElement").mockImplementation(() => {
      throw new Error("anchor unavailable");
    });

    await expect(savePdfFile({ pdfBytes: new Uint8Array([1]), filename: "exportai.pdf" })).rejects.toThrow(
      "anchor unavailable",
    );

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:exportai-anchor-failure");
  });
});
