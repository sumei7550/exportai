// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderExportFlowModal } from "../content/export-flow-modal";
import { MESSAGE_TYPE } from "../shared/messages";

afterEach(() => { document.body.replaceChildren(); });

describe("page-level export flow modal", () => {
  it("injects processing modal and rotates its copy", () => {
    renderExportFlowModal({ status: "processing", format: "Markdown" });
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Processing, Please wait...");
    expect(document.querySelector('[aria-label="Export in progress"]')).toBeTruthy();
  });

  it("shows success, coffee button, and closes from X or overlay", () => {
    renderExportFlowModal({ status: "success", format: "JSON", filename: "chat.json" });
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Export Success!");
    expect(document.querySelector("button")?.textContent).toContain("Buy me a coffee");
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    document.querySelector("button:not([aria-label])")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(openSpy).toHaveBeenCalledWith("https://ko-fi.com/sumei7550", "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
    document.querySelector('[aria-label="Close export message"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.getElementById("exportai-page-modal")).toBeNull();

    renderExportFlowModal({ status: "success", format: "JSON", filename: "chat.json" });
    const overlay = document.querySelector('[role="dialog"]');
    overlay?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(document.getElementById("exportai-page-modal")).toBeNull();
  });

});
