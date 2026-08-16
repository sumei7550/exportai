import {
  BLOCK_GAP_MM,
  BODY_FONT_SIZE,
  CODE_FONT,
  CODE_LINE_HEIGHT_MM,
  CODE_PADDING_MM,
  FONT_FAMILY,
  HEADING_FONT_SIZES,
  LIST_INDENT_MM,
  MESSAGE_GAP_MM,
  METADATA_FONT_SIZE,
  QUOTE_BORDER_MM,
  QUOTE_INDENT_MM,
  ROLE_FONT_SIZE,
  SECTION_GAP_MM,
  TITLE_FONT_SIZE,
  type PdfLayoutState,
  advanceY,
  ensureSpace,
  getLineHeight,
  setBodyTextColor,
} from "./pdf-layout";
import { renderInlineContent, renderPlainText } from "./pdf-inline-renderer";
import type { PdfBlockPlan, PdfInlinePlan, PdfListItemPlan } from "./pdf-types";

export function renderMessageBlocks(
  state: PdfLayoutState,
  blocks: PdfBlockPlan[],
  x: number,
  maxWidth: number,
): void {
  for (const block of blocks) {
    renderBlock(state, block, x, maxWidth);
    advanceY(state, BLOCK_GAP_MM);
  }
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
    case "list":
      renderListBlock(state, block.ordered, block.items, x, maxWidth, 0);
      return;
    case "quote":
      renderQuoteBlock(state, block.blocks, x, maxWidth);
      return;
    case "thematic-break":
      renderThematicBreak(state, x, maxWidth);
      return;
  }
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
  state.doc.setFillColor(245, 245, 245);
  state.doc.rect(x, backgroundTop, maxWidth, blockHeight, "F");

  let cursorX = x + CODE_PADDING_MM;
  let cursorY = state.y + CODE_PADDING_MM * 0.5;

  if (languageLabel) {
    state.doc.setFont(FONT_FAMILY, "normal");
    state.doc.setFontSize(METADATA_FONT_SIZE);
    setBodyTextColor(state.doc);
    state.doc.text(languageLabel, cursorX, cursorY);
    cursorY += labelHeight;
  }

  state.doc.setFont(CODE_FONT, "normal");
  state.doc.setFontSize(fontSize);
  setBodyTextColor(state.doc);

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
  state.doc.setFont(CODE_FONT, "normal");
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
    setBodyTextColor(state.doc);
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

  state.doc.setDrawColor(180, 180, 180);
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

export function renderRoleLabel(state: PdfLayoutState, label: string): void {
  renderPlainText(state, label, state.margin, state.contentWidth, ROLE_FONT_SIZE, "bold");
}

export { MESSAGE_GAP_MM };
