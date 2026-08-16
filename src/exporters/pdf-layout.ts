import type { jsPDF } from "jspdf";
import type { PdfExportWarning } from "./pdf-types";

export const FONT_FAMILY = "NotoSansSC";
export const CODE_FONT = "courier";
export const PAGE_MARGIN_MM = 14;
export const TITLE_FONT_SIZE = 16;
export const METADATA_FONT_SIZE = 10;
export const ROLE_FONT_SIZE = 11;
export const BODY_FONT_SIZE = 11;
export const SECTION_GAP_MM = 4;
export const MESSAGE_GAP_MM = 6;
export const BLOCK_GAP_MM = 3;
export const LIST_INDENT_MM = 6;
export const QUOTE_INDENT_MM = 5;
export const QUOTE_BORDER_MM = 1.5;
export const CODE_PADDING_MM = 2;
export const CODE_LINE_HEIGHT_MM = 4.5;
export const LINK_COLOR = { r: 0, g: 51, b: 153 };

export const HEADING_FONT_SIZES: Record<1 | 2 | 3 | 4 | 5 | 6, number> = {
  1: 18,
  2: 16,
  3: 14,
  4: 13,
  5: 12,
  6: 11,
};

export interface PdfLayoutState {
  doc: jsPDF;
  pageHeight: number;
  contentWidth: number;
  margin: number;
  y: number;
  warnings: PdfExportWarning[];
}

export function createLayoutState(doc: jsPDF): PdfLayoutState {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  return {
    doc,
    pageHeight,
    contentWidth: pageWidth - PAGE_MARGIN_MM * 2,
    margin: PAGE_MARGIN_MM,
    y: PAGE_MARGIN_MM,
    warnings: [],
  };
}

export function ensureSpace(state: PdfLayoutState, neededHeight: number): void {
  if (state.y + neededHeight <= state.pageHeight - state.margin) return;

  state.doc.addPage();
  state.y = state.margin;
  state.doc.setTextColor(0, 0, 0);
  state.doc.setFont(FONT_FAMILY, "normal");
}

export function advanceY(state: PdfLayoutState, amount: number): void {
  state.y += amount;
}

export function setBodyTextColor(doc: jsPDF): void {
  doc.setTextColor(0, 0, 0);
}

export function setLinkTextColor(doc: jsPDF): void {
  doc.setTextColor(LINK_COLOR.r, LINK_COLOR.g, LINK_COLOR.b);
}

export function getLineHeight(fontSize: number): number {
  return fontSize * 0.45 + 1.5;
}
