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

const chatGPTAdapter = new ChatGPTAdapter();

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
