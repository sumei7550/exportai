// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { exportConversationToMarkdown } from "../exporters/markdown-exporter";
import { saveMarkdownFile } from "../exporters/markdown-download-service";
import { exportMarkdownFromPopup } from "../popup/markdown-export-action";
import { createConversationFixture } from "./fixtures/conversation.fixture";

describe("Markdown export flow", () => {
  it("exports Markdown with the generated filename and reports a UI success state", async () => {
    const conversation = createConversationFixture();
    const save = vi.fn().mockResolvedValue(undefined);

    await expect(exportMarkdownFromPopup(conversation, save)).resolves.toMatchObject({
      status: "success",
      filename: "ExportAI fixture.md",
    });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ filename: "ExportAI fixture.md", markdown: expect.stringContaining("# ExportAI fixture") }));
  });

  it("does not save an empty conversation and returns a safe UI error state", async () => {
    const conversation = createConversationFixture();
    conversation.messages = [];
    const save = vi.fn().mockResolvedValue(undefined);

    await expect(exportMarkdownFromPopup(conversation, save)).resolves.toEqual({ status: "error", reason: "This conversation has no messages to export." });
    expect(save).not.toHaveBeenCalled();
  });

  it("propagates exporter warnings without exposing conversation text", async () => {
    const conversation = createConversationFixture();
    conversation.messages = [{ ...conversation.messages[0], blocks: [{ id: "unknown", type: "unknown", rawText: "Readable fallback" }] }];
    const save = vi.fn().mockResolvedValue(undefined);

    await expect(exportMarkdownFromPopup(conversation, save)).resolves.toEqual({
      status: "success",
      filename: "ExportAI fixture.md",
      warnings: [{ code: "UNKNOWN_BLOCK_FALLBACK", messageId: "message-user-001" }],
    });
  });

  it("returns an error UI state when saving fails", async () => {
    const conversation = createConversationFixture();
    const save = vi.fn().mockRejectedValue(new Error("disk failure"));

    await expect(exportMarkdownFromPopup(conversation, save)).resolves.toEqual({ status: "error", reason: "The Markdown file could not be saved. Please try again." });
  });

  it("creates a Markdown Blob and triggers a local download", async () => {
    const createObjectURL = vi.fn(() => "blob:exportai-test");
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    await saveMarkdownFile({ markdown: "# ExportAI", filename: "exportai.md" });

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:exportai-test");
    click.mockRestore();
    vi.unstubAllGlobals();
  });

  it("keeps the standalone exporter result consistent with the popup flow", () => {
    const result = exportConversationToMarkdown(createConversationFixture());
    expect(result).toMatchObject({ status: "success", filename: "ExportAI fixture.md" });
  });
});
