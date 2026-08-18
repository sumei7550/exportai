import {
  BLOCK_GAP_MM,
  BODY_FONT_SIZE,
  CODE_LINE_HEIGHT_MM,
  CODE_PADDING_MM,
  FONT_FAMILY,
  HEADING_FONT_SIZES,
  LIST_INDENT_MM,
  HEADER_BODY_GAP_MM,
  MESSAGE_BOTTOM_GAP_MM,
  METADATA_FONT_SIZE,
  QUOTE_BORDER_MM,
  QUOTE_INDENT_MM,
  ROLE_FONT_SIZE,
  SECTION_GAP_MM,
  TITLE_FONT_SIZE,
  USER_MESSAGE_MAX_WIDTH_RATIO,
  USER_MESSAGE_PADDING_MM,
  type PdfLayoutState,
  advanceY,
  ensureSpace,
  getLineHeight,
} from "./pdf-layout";
import autoTable from "jspdf-autotable";
import { renderInlineContent, renderPlainText } from "./pdf-inline-renderer";
import type { PdfBlockPlan, PdfInlinePlan, PdfListItemPlan, PdfMessagePlan } from "./pdf-types";

type AutoTableDocument = PdfLayoutState["doc"] & { lastAutoTable?: { finalY: number } };

export function renderMessageBlocks(
  state: PdfLayoutState,
  blocks: PdfBlockPlan[],
  x: number,
  maxWidth: number,
): void {
  blocks.forEach((block, index) => {
    renderBlock(state, block, x, maxWidth);
    if (index < blocks.length - 1) advanceY(state, BLOCK_GAP_MM);
  });
}

const ROLE_LABELS: Record<PdfMessagePlan["role"], string> = { user: "User", assistant: "Assistant" };

export function renderMessage(
  state: PdfLayoutState,
  message: PdfMessagePlan,
  x: number,
  maxWidth: number,
  model?: string,
): void {
  ensureSpace(state, getLineHeight(ROLE_FONT_SIZE) + HEADER_BODY_GAP_MM + getLineHeight(BODY_FONT_SIZE));
  const container = getMessageContainer(message, x, maxWidth);
  const bodyX = container.x + container.padding;
  const bodyWidth = container.width - container.padding * 2;
  const containerTop = state.y - getLineHeight(ROLE_FONT_SIZE) * 0.7;

  if (message.role === "user") {
    state.doc.setFillColor(...state.template.surface);
    state.doc.roundedRect(container.x, containerTop, container.width, estimateUserContainerHeight(state, message, bodyWidth), 2, 2, "F");
  }

  renderRoleLabel(state, getRoleLabel(message, model), bodyX, bodyWidth);
  renderMessageRule(state, bodyX, bodyWidth, 1.5);
  advanceY(state, HEADER_BODY_GAP_MM);
  renderMessageBlocks(state, message.blocks, bodyX, bodyWidth);
  renderMessageRule(state, bodyX, bodyWidth, 0);
  advanceY(state, MESSAGE_BOTTOM_GAP_MM);
}

function getMessageContainer(
  message: PdfMessagePlan,
  x: number,
  maxWidth: number,
): { x: number; width: number; padding: number } {
  if (message.role === "assistant") return { x, width: maxWidth, padding: 0 };

  const width = maxWidth * USER_MESSAGE_MAX_WIDTH_RATIO;
  return { x: x + maxWidth - width, width, padding: USER_MESSAGE_PADDING_MM };
}

function estimateUserContainerHeight(
  state: PdfLayoutState,
  message: PdfMessagePlan,
  bodyWidth: number,
): number {
  const bodyLines = message.blocks.reduce((total, block) => {
    if (block.type === "text" || block.type === "paragraph" || block.type === "heading" || block.type === "unknown" || block.type === "math") {
      return total + Math.max(1, state.doc.splitTextToSize(block.type === "heading" ? block.content.map((item) => item.text).join("") : block.type === "text" || block.type === "paragraph" ? block.content.map((item) => item.text).join("") : block.text, bodyWidth).length);
    }
    return total + 1;
  }, 0);

  return USER_MESSAGE_PADDING_MM * 2 + getLineHeight(ROLE_FONT_SIZE) + HEADER_BODY_GAP_MM + bodyLines * getLineHeight(BODY_FONT_SIZE) + 1;
}

function getRoleLabel(message: PdfMessagePlan, model: string | undefined): string {
  const roleLabel = ROLE_LABELS[message.role];
  if (message.role !== "assistant" || model === undefined || model.length === 0) return roleLabel;
  return `${roleLabel} · ${model}`;
}

function renderBlock(
  state: PdfLayoutState,
  block: PdfBlockPlan,
  x: number,
  maxWidth: number,
): void {
  switch (block.type) {
    case "text":
    case "paragraph":
      renderInlineContent(state, block.content, x, maxWidth, BODY_FONT_SIZE);
      return;
    case "heading":
      renderHeading(state, block.level, block.content, x, maxWidth);
      return;
    case "code":
      renderCodeBlock(state, block.code, block.language, x, maxWidth);
      return;
    case "math":
    case "unknown":
      renderPlainText(state, block.text, x, maxWidth, BODY_FONT_SIZE);
      return;
    case "list":
      renderListBlock(state, block.ordered, block.items, x, maxWidth, 0);
      return;
    case "table":
      renderTableBlock(state, block.headers, block.rows, x, maxWidth);
      return;
    case "image":
      renderImageBlock(state, block.src, block.alt, block.caption, x, maxWidth);
      return;
    case "quote":
      renderQuoteBlock(state, block.blocks, x, maxWidth);
      return;
    case "thematic-break":
      renderThematicBreak(state, x, maxWidth);
      return;
  }
}

function renderImageBlock(
  state: PdfLayoutState,
  src: string,
  alt: string,
  caption: string | undefined,
  x: number,
  maxWidth: number,
): void {
  const format = getImageFormat(src);
  if (format === null) {
    renderImageFallback(state, alt, caption, x, maxWidth, "IMAGE_UNSAFE_SOURCE");
    return;
  }

  try {
    const properties = state.doc.getImageProperties(src);
    const naturalWidth = Number(properties.width);
    const naturalHeight = Number(properties.height);
    if (!(naturalWidth > 0) || !(naturalHeight > 0)) throw new Error("Invalid image dimensions");

    const width = Math.min(maxWidth, naturalWidth * 0.264583);
    const availableHeight = state.pageHeight - state.margin * 2;
    const height = Math.min(width * naturalHeight / naturalWidth, availableHeight);
    const finalWidth = height === availableHeight ? height * naturalWidth / naturalHeight : width;
    const captionHeight = caption?.trim() ? getLineHeight(METADATA_FONT_SIZE) : 0;
    ensureSpace(state, height + captionHeight);
    state.doc.addImage(src, format, x, state.y, finalWidth, height);
    state.y += height;
    if (captionHeight > 0) {
      renderPlainText(state, caption!.trim(), x, maxWidth, METADATA_FONT_SIZE);
    }
  } catch {
    renderImageFallback(state, alt, caption, x, maxWidth, "IMAGE_EMBED_FAILED");
  }
}

function getImageFormat(src: string): "PNG" | "JPEG" | null {
  if (/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/i.test(src)) return "PNG";
  if (/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/i.test(src)) return "JPEG";
  return null;
}

function renderImageFallback(
  state: PdfLayoutState,
  alt: string,
  caption: string | undefined,
  x: number,
  maxWidth: number,
  code: "IMAGE_UNSAFE_SOURCE" | "IMAGE_EMBED_FAILED",
): void {
  if (!state.warnings.some((warning) => warning.code === code)) {
    state.warnings.push({
      code,
      message: "Image could not be embedded; readable fallback text was rendered.",
    });
  }
  const fallback = [alt.trim(), caption?.trim() ?? "", "[Image unavailable]"]
    .filter((text) => text.length > 0)
    .join(" - ");
  const lineHeight = getLineHeight(METADATA_FONT_SIZE);
  ensureSpace(state, lineHeight * 2);
  state.doc.setDrawColor(...state.template.border);
  state.doc.setFillColor(...state.template.surface);
  state.doc.rect(x, state.y - METADATA_FONT_SIZE * 0.35, maxWidth, lineHeight * 2, "FD");
  renderPlainText(state, fallback, x + 2, maxWidth - 4, METADATA_FONT_SIZE);
}

function renderTableBlock(
  state: PdfLayoutState,
  headers: PdfInlinePlan[][],
  rows: PdfInlinePlan[][][],
  x: number,
  maxWidth: number,
): void {
  const columnCount = Math.max(
    headers.length,
    ...rows.map((row) => row.length),
    1,
  );
  const head = [normalizeTableRow(headers, columnCount)];
  const body = rows.map((row) => normalizeTableRow(row, columnCount));

  state.doc.setFont(FONT_FAMILY, "normal");
  state.doc.setFontSize(BODY_FONT_SIZE);
  autoTable(state.doc, {
    startY: state.y,
    margin: { left: x, right: state.doc.internal.pageSize.getWidth() - x - maxWidth },
    tableWidth: maxWidth,
    head,
    body,
    theme: "grid",
    showHead: "everyPage",
    rowPageBreak: "auto",
    styles: {
      font: FONT_FAMILY,
      fontStyle: "normal",
      fontSize: BODY_FONT_SIZE - 1,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "top",
      textColor: state.template.text,
      lineColor: state.template.border,
      lineWidth: 0.2,
    },
    headStyles: {
      font: FONT_FAMILY,
      fontStyle: "bold",
      fillColor: state.template.tableHeader,
      textColor: state.template.text,
    },
    alternateRowStyles: { fillColor: state.template.tableAlternate },
  });

  const finalY = (state.doc as AutoTableDocument).lastAutoTable?.finalY;
  state.y = typeof finalY === "number" ? finalY : state.y;
  state.doc.setFont(FONT_FAMILY, "normal");
}

function normalizeTableRow(row: PdfInlinePlan[][], columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_, index) => inlineContentToTableText(row[index] ?? []));
}

function inlineContentToTableText(content: PdfInlinePlan[]): string {
  return content.map((inline) => inline.text).join("");
}

function renderHeading(
  state: PdfLayoutState,
  level: 1 | 2 | 3 | 4 | 5 | 6,
  content: PdfInlinePlan[],
  x: number,
  maxWidth: number,
): void {
  const fontSize = HEADING_FONT_SIZES[level];
  const boldContent = content.map((inline) => ({ ...inline, bold: inline.bold ?? true }));
  renderInlineContent(state, boldContent, x, maxWidth, fontSize);
}

function renderCodeBlock(
  state: PdfLayoutState,
  code: string,
  language: string | undefined,
  x: number,
  maxWidth: number,
): void {
  const fontSize = BODY_FONT_SIZE - 1;
  const textWidth = maxWidth - CODE_PADDING_MM * 2;
  const codeLines = code.split("\n");
  const wrappedLineCount = countWrappedCodeLines(state, codeLines, textWidth, fontSize);
  const languageLabel = language?.trim() ?? "";
  const labelHeight = languageLabel ? getLineHeight(METADATA_FONT_SIZE) : 0;
  const blockHeight = CODE_PADDING_MM * 2 + labelHeight + wrappedLineCount * CODE_LINE_HEIGHT_MM;

  ensureSpace(state, blockHeight);

  const backgroundTop = state.y - fontSize * 0.35;
  state.doc.setFillColor(...state.template.codeBackground);
  state.doc.rect(x, backgroundTop, maxWidth, blockHeight, "F");

  let cursorX = x + CODE_PADDING_MM;
  let cursorY = state.y + CODE_PADDING_MM * 0.5;

  if (languageLabel) {
    state.doc.setFont(FONT_FAMILY, "normal");
    state.doc.setFontSize(METADATA_FONT_SIZE);
    state.doc.setTextColor(...state.template.text);
    state.doc.text(languageLabel, cursorX, cursorY);
    cursorY += labelHeight;
  }

  state.doc.setFont(FONT_FAMILY, "normal");
  state.doc.setFontSize(fontSize);
  state.doc.setTextColor(...state.template.text);

  for (const line of codeLines) {
    const wrappedLines = state.doc.splitTextToSize(line, textWidth);
    for (const wrappedLine of wrappedLines) {
      state.doc.text(wrappedLine, cursorX, cursorY);
      cursorY += CODE_LINE_HEIGHT_MM;
    }
  }

  state.y = backgroundTop + blockHeight;
  state.doc.setFont(FONT_FAMILY, "normal");
}

function countWrappedCodeLines(
  state: PdfLayoutState,
  codeLines: string[],
  textWidth: number,
  fontSize: number,
): number {
  state.doc.setFont(FONT_FAMILY, "normal");
  state.doc.setFontSize(fontSize);

  return codeLines.reduce((count, line) => count + state.doc.splitTextToSize(line, textWidth).length, 0);
}

function renderListBlock(
  state: PdfLayoutState,
  ordered: boolean,
  items: PdfListItemPlan[],
  x: number,
  maxWidth: number,
  depth: number,
): void {
  const indent = x + depth * LIST_INDENT_MM;
  const markerWidth = LIST_INDENT_MM;
  const contentWidth = maxWidth - (indent - x) - markerWidth;
  const lineHeight = getLineHeight(BODY_FONT_SIZE);

  items.forEach((item, index) => {
    ensureSpace(state, lineHeight);

    const marker = ordered ? `${index + 1}.` : "•";
    state.doc.setFont(FONT_FAMILY, "normal");
    state.doc.setFontSize(BODY_FONT_SIZE);
    state.doc.setTextColor(...state.template.text);
    state.doc.text(marker, indent, state.y);

    const itemStartY = state.y;
    renderInlineContent(state, item.content, indent + markerWidth, contentWidth, BODY_FONT_SIZE);

    if (item.content.length === 0 || state.y === itemStartY) {
      advanceY(state, lineHeight);
    }

    if (item.children !== undefined) {
      renderListBlock(
        state,
        item.children.ordered,
        item.children.items,
        x,
        maxWidth,
        depth + 1,
      );
    }
  });
}

function renderQuoteBlock(
  state: PdfLayoutState,
  blocks: PdfBlockPlan[],
  x: number,
  maxWidth: number,
): void {
  if (blocks.length === 0) return;

  const quoteX = x + QUOTE_INDENT_MM;
  const quoteWidth = maxWidth - QUOTE_INDENT_MM;
  const borderX = x + QUOTE_BORDER_MM;
  const startY = state.y;

  renderMessageBlocks(state, blocks, quoteX, quoteWidth);

  const endY = state.y;
  const borderHeight = Math.max(endY - startY, getLineHeight(BODY_FONT_SIZE));

  state.doc.setDrawColor(...state.template.border);
  state.doc.setLineWidth(QUOTE_BORDER_MM);
  state.doc.line(borderX, startY - BODY_FONT_SIZE * 0.25, borderX, startY - BODY_FONT_SIZE * 0.25 + borderHeight);
}

function renderThematicBreak(state: PdfLayoutState, x: number, maxWidth: number): void {
  const gap = getLineHeight(BODY_FONT_SIZE) * 0.5;
  ensureSpace(state, gap * 2);
  advanceY(state, gap);

  state.doc.setDrawColor(160, 160, 160);
  state.doc.setLineWidth(0.3);
  state.doc.line(x, state.y, x + maxWidth, state.y);

  advanceY(state, gap);
}

export function renderTitleAndMetadata(
  state: PdfLayoutState,
  title: string,
  metadataLines: string[],
): void {
  renderPlainText(state, title, state.margin, state.contentWidth, TITLE_FONT_SIZE, "bold");
  advanceY(state, SECTION_GAP_MM);

  for (const line of metadataLines) {
    renderPlainText(state, line, state.margin, state.contentWidth, METADATA_FONT_SIZE);
  }

  advanceY(state, SECTION_GAP_MM);
}

function renderRoleLabel(state: PdfLayoutState, label: string, x: number, maxWidth: number): void {
  renderPlainText(state, label, x, maxWidth, ROLE_FONT_SIZE, "bold");
}

function renderMessageRule(
  state: PdfLayoutState,
  x: number,
  maxWidth: number,
  offset: number,
): void {
  state.doc.setDrawColor(...state.template.border);
  state.doc.setLineWidth(0.25);
  state.doc.line(x, state.y + offset, x + maxWidth, state.y + offset);
}
