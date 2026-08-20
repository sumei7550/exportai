import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { it } from "vitest";
import { exportConversationToPdf } from "../exporters/pdf-exporter";
import type { Conversation } from "../types/conversation";

const outputDirectory = resolve("tests/output/pdf-render");

function createConversation(userCode: string, assistantCode: string, id: string, prelude: Conversation["messages"] = [], userText?: string): Conversation {
  return {
    id, title: "PDF-002-E2 renderer sample", platform: "chatgpt", model: "example-model",
    sourceUrl: `https://chatgpt.com/c/${id}`, exportedAt: "2026-08-20T00:00:00.000Z",
    messages: [
      ...prelude,
      { id: `${id}-user`, role: "user", order: prelude.length, originalText: userText ? `${userText}\n${userCode}` : "User code block", blocks: [...(userText ? [{ id: `${id}-user-text`, type: "paragraph" as const, content: [{ text: userText }] }] : []), { id: `${id}-user-code`, type: "code" as const, language: "ts", code: userCode }], metadata: {} },
      { id: `${id}-assistant`, role: "assistant", order: prelude.length + 1, originalText: "Assistant code block", blocks: [{ id: `${id}-assistant-code`, type: "code", language: "ts", code: assistantCode }], metadata: {} },
    ],
    metadata: { messageCount: prelude.length + 2, isComplete: true, parseWarnings: [], modelVersion: "1.0" },
  };
}

function createMultiTurnConversation(): Conversation {
  const id = "pdf-002-multi-turn-render-sample";
  const paragraph = (text: string, blockId: string) => ({ id: blockId, type: "paragraph" as const, content: [{ text }] });
  return {
    id, title: "PDF-002 multi-turn surface sample", platform: "chatgpt", model: "example-model",
    sourceUrl: `https://chatgpt.com/c/${id}`, exportedAt: "2026-08-20T00:00:00.000Z",
    messages: [
      { id: `${id}-user-1`, role: "user", order: 0, originalText: "User 1", blocks: [paragraph("User 1 stays on the right.", `${id}-user-1-block`)], metadata: {} },
      { id: `${id}-assistant-1`, role: "assistant", order: 1, originalText: "Assistant 1", blocks: [paragraph("Assistant 1 stays in the full content column.", `${id}-assistant-1-block`)], metadata: {} },
      { id: `${id}-user-2`, role: "user", order: 2, originalText: "User 2", blocks: [
        paragraph("User 2 crosses a page boundary. ".repeat(100), `${id}-user-2-text`),
        { id: `${id}-user-2-code`, type: "code" as const, language: "ts", code: Array.from({ length: 40 }, (_, index) => `const userTurnTwoLine${index} = 'right aligned continuation';`).join("\n") },
        { id: `${id}-user-2-image`, type: "image" as const, src: "https://example.test/unsupported.png", alt: "User 2 image fallback" },
      ], metadata: {} },
      { id: `${id}-assistant-2`, role: "assistant", order: 3, originalText: "Assistant 2", blocks: [paragraph("Assistant 2 must not inherit the User 2 surface.", `${id}-assistant-2-block`)], metadata: {} },
      { id: `${id}-user-3`, role: "user", order: 4, originalText: "User 3", blocks: [paragraph("User 3 starts a fresh right-side surface.", `${id}-user-3-block`)], metadata: {} },
      { id: `${id}-assistant-3`, role: "assistant", order: 5, originalText: "Assistant 3", blocks: [paragraph("Assistant 3 remains left aligned.", `${id}-assistant-3-block`)], metadata: {} },
    ],
    metadata: { messageCount: 6, isComplete: true, parseWarnings: [], modelVersion: "1.0" },
  };
}

it("generates the PDF-002-E2 renderer sample from the production exporter", () => {
  mkdirSync(outputDirectory, { recursive: true });
  const samples = [
    ["pdf-002-e2-sample.pdf", createConversation("const userSide = true;\nconsole.log(userSide);", "const assistantSide = true;\nconsole.log(assistantSide);", "pdf-002-e2-render-sample")],
    ["pdf-002-e2-long-code-sample.pdf", createConversation(
      "const userSide = { enabled: true, description: 'This deliberately long line must wrap inside the right-aligned User code block without clipping or escaping its background.' };\nconsole.log(userSide);",
      "const assistantSide = { enabled: true, description: 'Assistant code remains in the full content column while the preceding User container ends at its own measured height.' };\nconsole.log(assistantSide);",
      "pdf-002-e2-long-code-render-sample",
    )],
    ["pdf-002-e2-multi-turn-surface-sample.pdf", createMultiTurnConversation()],
    ["pdf-002-e2-text-code-sample.pdf", createConversation(
      "const userSide = true;\nconsole.log(userSide);", "const assistantSide = true;\nconsole.log(assistantSide);", "pdf-002-e2-text-code-render-sample", [], "请输出下面代码：")],
    ["pdf-002-e2-pagination-sample.pdf", createConversation(
      Array.from({ length: 90 }, (_, index) => `const userLine${index} = 'This User message deliberately continues across a page boundary so its surface must be painted on every page.';`).join("\n"),
      "const assistantSide = { pagination: true, description: 'Assistant code follows the User message after pagination without clipping or overlap.' };\nconsole.log(assistantSide);",
      "pdf-002-e2-pagination-render-sample",
      Array.from({ length: 10 }, (_, index) => ({
        id: `pagination-prelude-${index}`,
        role: "assistant" as const,
        order: index,
        originalText: `Prelude paragraph ${index} ${"This preceding content fills the page before the code block. ".repeat(8)}`,
        blocks: [{ id: `pagination-prelude-block-${index}`, type: "paragraph" as const, content: [{ text: `Prelude paragraph ${index} ${"This preceding content fills the page before the code block. ".repeat(8)}` }] }],
        metadata: {},
      })),
    )],
  ] as const;
  for (const [filename, conversation] of samples) {
    const result = exportConversationToPdf(conversation);
    if (result.status === "error") throw new Error(result.code);
    writeFileSync(resolve(outputDirectory, filename), result.data);
  }
});
