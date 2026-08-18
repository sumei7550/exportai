import { jsPDF } from "jspdf";
import { NOTO_SANS_SC_REGULAR_BASE64 } from "../assets/fonts-test/NotoSansSC-Regular.js";
import { NOTO_SANS_SC_BOLD_BASE64 } from "../assets/fonts/NotoSansSC-Bold.js";
import { renderMessage, renderTitleAndMetadata } from "./pdf-block-renderer";
import {
  FONT_FAMILY,
  createLayoutState,
} from "./pdf-layout";
import type { PdfDocumentPlan } from "./pdf-types";
import { hasValidPdfSignature } from "./pdf-types";

const FONT_FILE = "NotoSansSC-Regular.ttf";
const BOLD_FONT_FILE = "NotoSansSC-Bold.ttf";

export interface PdfEngineResult {
  data: Uint8Array;
  hasValidSignature: boolean;
  warnings: PdfDocumentPlan["warnings"];
}

export function renderPdfDocumentPlan(plan: PdfDocumentPlan): PdfEngineResult {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  registerCjkFont(doc);

  const state = createLayoutState(doc, plan.template);
  doc.setFillColor(...state.template.pageBackground);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), state.pageHeight, "F");
  doc.setTextColor(...state.template.text);
  state.warnings.push(...plan.warnings);
  const metadataLines = buildMetadataLines(plan);

  doc.setProperties({ title: plan.title, subject: "Chat conversation export", creator: "ExportAI" });

  renderTitleAndMetadata(state, plan.title, metadataLines);

  for (const message of plan.messages) {
    renderMessage(state, message, state.margin, state.contentWidth, plan.metadata.model);
  }

  const data = new Uint8Array(doc.output("arraybuffer"));
  return { data, hasValidSignature: hasValidPdfSignature(data), warnings: state.warnings };
}

function registerCjkFont(doc: jsPDF): void {
  doc.addFileToVFS(FONT_FILE, NOTO_SANS_SC_REGULAR_BASE64);
  doc.addFileToVFS(BOLD_FONT_FILE, NOTO_SANS_SC_BOLD_BASE64);
  doc.addFont(FONT_FILE, FONT_FAMILY, "normal");
  doc.addFont(BOLD_FONT_FILE, FONT_FAMILY, "bold");
  doc.setFont(FONT_FAMILY);
}

function buildMetadataLines(plan: PdfDocumentPlan): string[] {
  const lines = [`Platform: ${plan.metadata.platform}`];
  if (plan.metadata.model !== undefined) lines.push(`Model: ${plan.metadata.model}`);
  lines.push(`ExportedAt: ${plan.metadata.exportedAt}`);
  return lines;
}
