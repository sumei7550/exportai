import { jsPDF } from "jspdf";
import { NOTO_SANS_SC_SUBSET_BASE64 } from "../assets/fonts-subset/NotoSansSC-Subset.js";
import { renderMessageBlocks, renderRoleLabel, renderTitleAndMetadata } from "./pdf-block-renderer";
import {
  FONT_FAMILY,
  MESSAGE_GAP_MM,
  createLayoutState,
  advanceY,
} from "./pdf-layout";
import type { PdfDocumentPlan } from "./pdf-types";
import { hasValidPdfSignature } from "./pdf-types";

const FONT_FILE = "NotoSansSC-Subset.ttf";

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

  const state = createLayoutState(doc);
  const metadataLines = buildMetadataLines(plan);

  renderTitleAndMetadata(state, plan.title, metadataLines);

  for (const message of plan.messages) {
    renderRoleLabel(state, ROLE_LABELS[message.role]);
    renderMessageBlocks(state, message.blocks, state.margin, state.contentWidth);
    advanceY(state, MESSAGE_GAP_MM);
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
