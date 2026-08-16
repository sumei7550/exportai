import { ChatGPTAdapter } from "../adapters/chatgpt/chatgpt-adapter";
import { detectPlatformFromHostname, isExportSupported } from "../constants/platforms";
import { MESSAGE_TYPE, type ContentScriptRequest, type PageStatus } from "../shared/messages";
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
    void runExport(message.format);
  }
  if (message.type === MESSAGE_TYPE.exportFlow) renderExportFlowModal(message.payload);
});

async function runExport(format: "PDF" | "Markdown" | "JSON"): Promise<void> {
  const platform = detectPlatformFromHostname(window.location.hostname);
  if (platform === null) {
    renderExportToast("Please use on supported AI chat websites");
    return;
  }
  if (!isExportSupported(platform)) {
    renderExportToast(`${platform} export is coming soon.`);
    return;
  }
  renderExportFlowModal({ status: "processing", format });
  const result = await chatGPTAdapter.collect(document, window.location);
  if (result.status !== "success") {
    renderExportFlowModal({ status: "error", format, reason: result.status === "empty" ? result.reason : "The conversation could not be collected safely." });
    return;
  }
  try {
    if (format === "Markdown") {
      const exported = exportConversationToMarkdown(result.conversation);
      if (exported.status === "error") throw new Error("This conversation has no messages to export.");
      await saveMarkdownFile({ markdown: exported.markdown, filename: exported.filename });
      renderExportFlowModal({ status: "success", format, filename: exported.filename });
    } else if (format === "JSON") {
      const exported = exportConversationToJson(result.conversation);
      if (exported.status === "error") throw new Error("This conversation could not be exported.");
      await saveJsonFile({ json: exported.json, filename: exported.filename });
      renderExportFlowModal({ status: "success", format, filename: exported.filename });
    } else {
      const exported = exportConversationToPdf(result.conversation);
      if (exported.status === "error") throw new Error(exported.code);
      await savePdfFile({ pdfBytes: exported.data, filename: exported.filename });
      renderExportFlowModal({ status: "success", format, filename: exported.filename });
    }
  } catch (error) {
    renderExportFlowModal({ status: "error", format, reason: error instanceof Error ? error.message : "The file could not be saved. Please try again." });
  }
}
