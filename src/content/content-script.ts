import { ChatGPTAdapter } from "../adapters/chatgpt/chatgpt-adapter";
import { detectPlatformFromHostname, isExportSupported } from "../constants/platforms";
import { MESSAGE_TYPE, type ContentScriptRequest, type ExportRequestResponse, type PageStatus } from "../shared/messages";
import { renderExportFlowModal, renderExportToast } from "./export-flow-modal";
import { exportConversationToMarkdown } from "../exporters/markdown-exporter";
import { saveMarkdownFile } from "../exporters/markdown-download-service";
import { exportConversationToJson } from "../exporters/json-exporter";
import { saveJsonFile } from "../exporters/json-download-service";
import { exportConversationToPdf } from "../exporters/pdf-exporter";
import { savePdfFile } from "../exporters/pdf-download-service";
import type { ChatGPTCollectionDiagnostic } from "../adapters/chatgpt/chatgpt-conversation-collector";

type ExportAIDebugState = {
  initialScrollTop?: number;
  scrollContainer?: string;
  windows: Array<{ windowIndex?: number; capturedCount?: number; windowSignature?: string }>;
  messageCount?: number;
  orderedMessages?: unknown[];
  isComplete?: boolean;
  warnings?: unknown[];
  restoredScrollTop?: number;
};

type ExportAIDebugWindow = Window & {
  __EXPORTAI_DEBUG__?: ExportAIDebugState;
  __EXPORTAI_ISSUE_001_DEBUG__?: boolean;
};

const debugWindow = window as ExportAIDebugWindow;
let debugState: ExportAIDebugState = { windows: [] };

function isIssue001DebugEnabled(): boolean {
  return debugWindow.__EXPORTAI_ISSUE_001_DEBUG__ === true;
}

function resetDebugState(): void {
  if (!isIssue001DebugEnabled()) return;
  debugState = { windows: [] };
  publishDebugState();
}

function publishDebugState(): void {
  const serialized = JSON.stringify(debugState);
  debugWindow.__EXPORTAI_DEBUG__ = debugState;
  document.documentElement?.setAttribute("data-exportai-debug", serialized);
}

function recordDiagnostic(event: ChatGPTCollectionDiagnostic | Record<string, unknown>): void {
  if (!isIssue001DebugEnabled()) return;
  const value = event as Record<string, unknown>;
  const type = typeof value.type === "string" ? value.type : "unknown";
  if (type === "initial") {
    debugState.initialScrollTop = typeof value.scrollTop === "number" ? value.scrollTop : undefined;
    debugState.scrollContainer = typeof value.scrollContainer === "string" ? value.scrollContainer : undefined;
  } else if (type === "window") {
    debugState.windows.push({
      windowIndex: typeof value.windowIndex === "number" ? value.windowIndex : undefined,
      capturedCount: typeof value.capturedCount === "number" ? value.capturedCount : undefined,
      windowSignature: typeof value.windowSignature === "string" ? value.windowSignature : undefined,
    });
  } else if (type === "restore") {
    debugState.restoredScrollTop = typeof value.scrollTop === "number" ? value.scrollTop : undefined;
  } else if (type === "result") {
    debugState.messageCount = typeof value.messageCount === "number" ? value.messageCount : undefined;
    debugState.orderedMessages = Array.isArray(value.orderedMessages) ? value.orderedMessages : undefined;
    debugState.isComplete = typeof value.isComplete === "boolean" ? value.isComplete : undefined;
    debugState.warnings = Array.isArray(value.warnings) ? value.warnings : undefined;
  }
  publishDebugState();
  console.info("[ExportAI][ISSUE-001]", event);
}

const chatGPTAdapter = new ChatGPTAdapter({ onDiagnostic: recordDiagnostic });

function createPageStatus(): PageStatus {
  return {
    platform: detectPlatformFromHostname(window.location.hostname),
    pageUrl: window.location.href,
  };
}

chrome.runtime.onMessage.addListener((message: ContentScriptRequest, _sender, sendResponse) => {
  if (message.type === MESSAGE_TYPE.getPageStatus) {
    sendResponse({ type: MESSAGE_TYPE.pageStatus, payload: createPageStatus() });
    return;
  }
  if (message.type === MESSAGE_TYPE.parseConversation) {
    void chatGPTAdapter.collect(document, window.location).then((payload) => {
      sendResponse({ type: MESSAGE_TYPE.conversationParsed, payload });
    }).catch(() => {
      sendResponse({
        type: MESSAGE_TYPE.conversationParsed,
        payload: { status: "error", reason: "The ChatGPT conversation could not be collected safely." },
      });
    });
    return true;
  }
  if (message.type === MESSAGE_TYPE.exportRequest) {
    void prepareExport(message.format).then((prepared) => {
      sendResponse(prepared.response);
      if (prepared.response.status === "started") void completeExport(message.format);
    });
    return true;
  }
  if (message.type === MESSAGE_TYPE.exportFlow) renderExportFlowModal(message.payload);
});

type PreparedExport = {
  response: ExportRequestResponse;
};

async function prepareExport(format: "PDF" | "Markdown" | "JSON"): Promise<PreparedExport> {
  const platform = detectPlatformFromHostname(window.location.hostname);
  if (platform === null) {
    renderExportToast("Please use on supported AI chat websites");
    return { response: { status: "started" } };
  }
  if (!isExportSupported(platform)) {
    renderExportToast(`${platform} export is coming soon.`);
    return { response: { status: "started" } };
  }
  const readiness = chatGPTAdapter.parse(document, window.location);
  if (readiness.status !== "success") {
    if (readiness.status === "empty") {
      return { response: { status: "empty" } };
    } else {
      renderExportFlowModal({ status: "error", format, reason: "The conversation could not be collected safely." });
    }
    return { response: { status: "started" } };
  }
  renderExportFlowModal({ status: "processing", format });
  return { response: { status: "started" } };
}

async function completeExport(format: "PDF" | "Markdown" | "JSON"): Promise<void> {
  resetDebugState();
  const result = await chatGPTAdapter.collect(document, window.location);
  if (result.status !== "success") {
    renderExportFlowModal({ status: "error", format, reason: "The conversation could not be collected safely." });
    return;
  }
  const conversation = result.conversation;
  try {
    if (format === "Markdown") {
      const exported = exportConversationToMarkdown(conversation);
      if (exported.status === "error") throw new Error("This conversation has no messages to export.");
      await saveMarkdownFile({ markdown: exported.markdown, filename: exported.filename });
      renderExportFlowModal({ status: "success", format, filename: exported.filename });
    } else if (format === "JSON") {
      const exported = exportConversationToJson(conversation);
      if (exported.status === "error") throw new Error("This conversation could not be exported.");
      await saveJsonFile({ json: exported.json, filename: exported.filename });
      renderExportFlowModal({ status: "success", format, filename: exported.filename });
    } else {
      const exported = exportConversationToPdf(conversation);
      if (exported.status === "error") throw new Error(exported.code);
      await savePdfFile({ pdfBytes: exported.data, filename: exported.filename });
      renderExportFlowModal({ status: "success", format, filename: exported.filename });
    }
  } catch (error) {
    renderExportFlowModal({ status: "error", format, reason: error instanceof Error ? error.message : "The file could not be saved. Please try again." });
  }
}
