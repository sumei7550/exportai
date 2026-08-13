import type { Block, InlineContent, ListBlock } from "../types/conversation";
import { escapeMarkdownText, getSafeMarkdownUrl, renderInlineContent } from "./markdown-inline-renderer";

export interface MarkdownRenderWarning {
  code: "UNSAFE_URL_FALLBACK" | "UNKNOWN_BLOCK_FALLBACK" | "UNKNOWN_BLOCK_EMPTY";
  blockId: string;
}

export interface MarkdownBlockRenderResult {
  markdown: string;
  warnings: MarkdownRenderWarning[];
}

export function renderBlocksMarkdown(blocks: Block[]): MarkdownBlockRenderResult {
  const renderedBlocks = blocks.map(renderBlockMarkdown);

  return {
    markdown: renderedBlocks.map((result) => result.markdown).filter(Boolean).join("\n\n"),
    warnings: renderedBlocks.flatMap((result) => result.warnings),
  };
}

export function renderBlockMarkdown(block: Block): MarkdownBlockRenderResult {
  switch (block.type) {
    case "text":
    case "paragraph":
      return success(renderInlineContent(block.content));
    case "heading":
      return success(`${"#".repeat(block.level)} ${renderInlineContent(block.content)}`);
    case "list":
      return success(renderList(block));
    case "code":
      return success(renderCodeBlock(block.code, block.language));
    case "table":
      return success(renderTable(block.headers, block.rows));
    case "math":
      return success(block.display ? `$$\n${block.latex}\n$$` : `$${block.latex}$`);
    case "image":
      return renderImage(block.id, block.src, block.alt, block.caption);
    case "link":
      return renderLink(block.id, block.href, block.content);
    case "quote": {
      const nested = renderBlocksMarkdown(block.blocks);
      return { markdown: prefixQuote(nested.markdown), warnings: nested.warnings };
    }
    case "thematic-break":
      return success("---");
    case "unknown":
      return block.rawText.trim()
        ? { markdown: escapeMarkdownText(block.rawText), warnings: [{ code: "UNKNOWN_BLOCK_FALLBACK", blockId: block.id }] }
        : { markdown: "_Unsupported content omitted._", warnings: [{ code: "UNKNOWN_BLOCK_EMPTY", blockId: block.id }] };
  }
}

function success(markdown: string): MarkdownBlockRenderResult {
  return { markdown, warnings: [] };
}

function renderList(list: ListBlock, depth = 0): string {
  const indentation = "  ".repeat(depth);

  return list.items.map((item, index) => {
    const marker = list.ordered ? `${index + 1}.` : "-";
    const itemLine = `${indentation}${marker} ${renderInlineContent(item.content)}`;
    const children = item.children ? `\n${renderList(item.children, depth + 1)}` : "";
    return `${itemLine}${children}`;
  }).join("\n");
}

function renderCodeBlock(code: string, language?: string): string {
  const longestRun = Math.max(0, ...Array.from(code.matchAll(/`+/g), (match) => match[0].length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  const languageLabel = language?.trim() ?? "";
  return `${fence}${languageLabel}\n${code}\n${fence}`;
}

function renderTable(headers: InlineContent[][], rows: InlineContent[][][]): string {
  const columnCount = Math.max(1, headers.length, ...rows.map((row) => row.length));
  const headerCells = Array.from({ length: columnCount }, (_, index) => renderTableCell(headers[index] ?? []));
  const renderedRows = rows.map((row) => renderTableRow(row, columnCount));

  return [
    `| ${headerCells.join(" | ")} |`,
    `| ${Array.from({ length: columnCount }, () => "---").join(" | ")} |`,
    ...renderedRows,
  ].join("\n");
}

function renderTableRow(row: InlineContent[][], columnCount: number): string {
  const cells = Array.from({ length: columnCount }, (_, index) => renderTableCell(row[index] ?? []));
  return `| ${cells.join(" | ")} |`;
}

function renderTableCell(content: InlineContent[]): string {
  return renderInlineContent(content)
    .replace(/\r?\n/g, "<br>")
    .replace(/\\\|/g, "\u0000")
    .replace(/\|/g, "\\|")
    .replace(/\u0000/g, "\\|");
}

function renderImage(blockId: string, src: string, alt: string, caption?: string): MarkdownBlockRenderResult {
  const safeUrl = getSafeMarkdownUrl(src);
  if (!safeUrl) {
    return { markdown: escapeMarkdownText(alt || "Image unavailable"), warnings: [{ code: "UNSAFE_URL_FALLBACK", blockId }] };
  }

  const title = caption?.trim() ? ` "${caption.replace(/"/g, "\\\"")}"` : "";
  return success(`![${escapeMarkdownText(alt)}](<${safeUrl}>${title})`);
}

function renderLink(blockId: string, href: string, content: InlineContent[]): MarkdownBlockRenderResult {
  const text = renderInlineContent(content) || escapeMarkdownText(href);
  const safeUrl = getSafeMarkdownUrl(href);
  return safeUrl
    ? success(`[${text}](<${safeUrl}>)`)
    : { markdown: text, warnings: [{ code: "UNSAFE_URL_FALLBACK", blockId }] };
}

function prefixQuote(markdown: string): string {
  return markdown.split("\n").map((line) => line ? `> ${line}` : ">").join("\n");
}
