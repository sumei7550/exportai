import {
  BODY_FONT_SIZE,
  FONT_FAMILY,
  type PdfLayoutState,
  advanceY,
  ensureSpace,
  getLineHeight,
} from "./pdf-layout";
import type { PdfInlinePlan } from "./pdf-types";

interface InlineStyle {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  code: boolean;
  href?: string;
}

interface StyledChar {
  char: string;
  style: InlineStyle;
}

interface StyledSegment {
  text: string;
  style: InlineStyle;
}

function createInlineStyle(inline: PdfInlinePlan): InlineStyle {
  return {
    bold: inline.bold === true,
    italic: inline.italic === true,
    strikethrough: inline.strikethrough === true,
    code: inline.code === true,
    href: inline.href,
  };
}

function stylesEqual(left: InlineStyle, right: InlineStyle): boolean {
  return (
    left.bold === right.bold
    && left.italic === right.italic
    && left.strikethrough === right.strikethrough
    && left.code === right.code
    && left.href === right.href
  );
}

function expandToStyledChars(inlines: PdfInlinePlan[]): StyledChar[] {
  const chars: StyledChar[] = [];

  for (const inline of inlines) {
    const style = createInlineStyle(inline);
    for (const char of inline.text) {
      chars.push({ char, style });
    }
  }

  return chars;
}

function mergeAdjacentSegments(line: StyledChar[]): StyledSegment[] {
  if (line.length === 0) return [];

  const segments: StyledSegment[] = [];
  let currentText = line[0].char;
  let currentStyle = line[0].style;

  for (let index = 1; index < line.length; index += 1) {
    const next = line[index];
    if (stylesEqual(currentStyle, next.style)) {
      currentText += next.char;
      continue;
    }

    segments.push({ text: currentText, style: currentStyle });
    currentText = next.char;
    currentStyle = next.style;
  }

  segments.push({ text: currentText, style: currentStyle });
  return segments;
}

function applyInlineStyle(state: PdfLayoutState, style: InlineStyle, fontSize: number): void {
  const doc = state.doc;
  if (style.code) {
    doc.setFont(FONT_FAMILY, "normal");
  } else {
    doc.setFont(FONT_FAMILY, style.bold ? "bold" : "normal");
  }

  doc.setFontSize(fontSize);

  if (style.href !== undefined) {
    doc.setTextColor(...state.template.link);
  } else {
    doc.setTextColor(...state.template.text);
  }
}

function measureStyledChar(state: PdfLayoutState, styledChar: StyledChar, fontSize: number): number {
  applyInlineStyle(state, styledChar.style, fontSize);
  return state.doc.getTextWidth(styledChar.char);
}

function layoutStyledLines(
  state: PdfLayoutState,
  inlines: PdfInlinePlan[],
  maxWidth: number,
  fontSize: number,
): StyledChar[][] {
  const chars = expandToStyledChars(inlines);
  if (chars.length === 0) return [];

  const lines: StyledChar[][] = [];
  let currentLine: StyledChar[] = [];
  let currentWidth = 0;

  for (const styledChar of chars) {
    if (styledChar.char === "\n") {
      if (currentLine.length > 0) lines.push(currentLine);
      lines.push([]);
      currentLine = [];
      currentWidth = 0;
      continue;
    }

    const charWidth = measureStyledChar(state, styledChar, fontSize);

    if (currentWidth + charWidth > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    }

    currentLine.push(styledChar);
    currentWidth += charWidth;
  }

  if (currentLine.length > 0) lines.push(currentLine);
  return lines;
}

function drawStrikethrough(doc: jsPDF, text: string, x: number, y: number, fontSize: number): void {
  const width = doc.getTextWidth(text);
  const lineY = y - fontSize * 0.28;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(x, lineY, x + width, lineY);
}

function drawUnderline(doc: jsPDF, text: string, x: number, y: number): void {
  const width = doc.getTextWidth(text);
  const lineY = y + 0.6;
  doc.setDrawColor(0, 51, 153);
  doc.setLineWidth(0.2);
  doc.line(x, lineY, x + width, lineY);
}

function renderItalicSegment(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  style: InlineStyle,
): void {
  doc.text(text, x, y);
}

function renderStyledSegment(
  state: PdfLayoutState,
  segment: StyledSegment,
  x: number,
  y: number,
  fontSize: number,
): number {
  applyInlineStyle(state, segment.style, fontSize);
  const doc = state.doc;

  if (segment.style.italic) {
    renderItalicSegment(doc, segment.text, x, y, fontSize, segment.style);
  } else {
    doc.text(segment.text, x, y);
  }

  const width = doc.getTextWidth(segment.text);

  if (segment.style.strikethrough) {
    drawStrikethrough(doc, segment.text, x, y, fontSize);
  }

  if (segment.style.href !== undefined) {
    drawUnderline(doc, segment.text, x, y);
  }

  return width;
}

function renderStyledLine(
  state: PdfLayoutState,
  line: StyledChar[],
  x: number,
  y: number,
  fontSize: number,
): void {
  const segments = mergeAdjacentSegments(line);
  let cursorX = x;

  for (const segment of segments) {
    cursorX += renderStyledSegment(state, segment, cursorX, y, fontSize);
  }
}

export function renderInlineContent(
  state: PdfLayoutState,
  inlines: PdfInlinePlan[],
  x: number,
  maxWidth: number,
  fontSize: number = BODY_FONT_SIZE,
): void {
  if (inlines.length === 0) return;

  const lines = layoutStyledLines(state, inlines, maxWidth, fontSize);
  const lineHeight = getLineHeight(fontSize);

  for (const line of lines) {
    ensureSpace(state, lineHeight);
    renderStyledLine(state, line, x, state.y, fontSize);
    advanceY(state, lineHeight);
  }
}

export function renderPlainText(
  state: PdfLayoutState,
  text: string,
  x: number,
  maxWidth: number,
  fontSize: number,
  fontStyle: "normal" | "bold" = "normal",
): void {
  state.doc.setFont(FONT_FAMILY, fontStyle);
  state.doc.setFontSize(fontSize);
  state.doc.setTextColor(...state.template.text);

  const lineHeight = getLineHeight(fontSize);
  const lines = state.doc.splitTextToSize(text, maxWidth);

  for (const line of lines) {
    ensureSpace(state, lineHeight);
    state.doc.text(line, x, state.y);
    advanceY(state, lineHeight);
  }
}


import type { jsPDF } from "jspdf";
