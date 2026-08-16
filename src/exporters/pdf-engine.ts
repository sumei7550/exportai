import { jsPDF } from "jspdf";
import { NOTO_SANS_SC_SUBSET_BASE64 } from "../assets/fonts-subset/NotoSansSC-Subset.js";
import type { PdfDocumentPlan } from "./pdf-types";
import { hasValidPdfSignature } from "./pdf-types";

const FONT_FILE = "NotoSansSC-Subset.ttf";
const FONT_FAMILY = "NotoSansSC";
const PAGE_MARGIN_MM = 14;
const TITLE_FONT_SIZE = 16;
const METADATA_FONT_SIZE = 10;
const ROLE_FONT_SIZE = 11;
const BODY_FONT_SIZE = 11;
const SECTION_GAP_MM = 4;
const MESSAGE_GAP_MM = 6;

const ROLE_LABELS: Record<PdfDocumentPlan["messages"][number]["role"], string> = {
  user: "User",
  assistant: "Assistant",
};

export interface PdfEngineResult {
  data: Uint8Array;
  hasValidSignature: boolean;
}

export function renderPdfDocumentPlan(plan: PdfDocumentPlan): PdfEngineResult {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  registerCjkFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN_MM * 2;
  let cursorY = PAGE_MARGIN_MM;

  cursorY = writeWrappedText(doc, plan.title, PAGE_MARGIN_MM, cursorY, contentWidth, {
    fontSize: TITLE_FONT_SIZE,
    fontStyle: "bold",
    lineHeight: 7,
    pageHeight,
  });
  cursorY += SECTION_GAP_MM;

  const metadataLines = buildMetadataLines(plan);
  for (const line of metadataLines) {
    cursorY = writeWrappedText(doc, line, PAGE_MARGIN_MM, cursorY, contentWidth, {
      fontSize: METADATA_FONT_SIZE,
      lineHeight: 5,
      pageHeight,
    });
  }
  cursorY += SECTION_GAP_MM;

  for (const message of plan.messages) {
    cursorY = writeWrappedText(doc, ROLE_LABELS[message.role], PAGE_MARGIN_MM, cursorY, contentWidth, {
      fontSize: ROLE_FONT_SIZE,
      fontStyle: "bold",
      lineHeight: 5,
      pageHeight,
    });
    cursorY = writeWrappedText(doc, message.text, PAGE_MARGIN_MM, cursorY, contentWidth, {
      fontSize: BODY_FONT_SIZE,
      lineHeight: 5.5,
      pageHeight,
    });
    cursorY += MESSAGE_GAP_MM;
  }

  const data = new Uint8Array(doc.output("arraybuffer"));
  return { data, hasValidSignature: hasValidPdfSignature(data) };
}

function registerCjkFont(doc: jsPDF): void {
  doc.addFileToVFS(FONT_FILE, NOTO_SANS_SC_SUBSET_BASE64);
  doc.addFont(FONT_FILE, FONT_FAMILY, "normal");
  doc.addFont(FONT_FILE, FONT_FAMILY, "bold");
  doc.setFont(FONT_FAMILY);
}

function buildMetadataLines(plan: PdfDocumentPlan): string[] {
  const lines = [`Platform: ${plan.metadata.platform}`];
  if (plan.metadata.model !== undefined) lines.push(`Model: ${plan.metadata.model}`);
  return lines;
}

interface WriteTextOptions {
  fontSize: number;
  fontStyle?: "normal" | "bold";
  lineHeight: number;
  pageHeight: number;
}

function writeWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  options: WriteTextOptions,
): number {
  doc.setFont(FONT_FAMILY, options.fontStyle ?? "normal");
  doc.setFontSize(options.fontSize);

  const lines = doc.splitTextToSize(text, maxWidth);
  let y = startY;

  for (const line of lines) {
    if (y + options.lineHeight > options.pageHeight - PAGE_MARGIN_MM) {
      doc.addPage();
      y = PAGE_MARGIN_MM;
    }
    doc.text(line, x, y);
    y += options.lineHeight;
  }

  return y;
}
