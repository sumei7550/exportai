import { useEffect, useState } from "react";
import { getPlatformLabel } from "../constants/platforms";
import type { Conversation } from "../types/conversation";
import { saveJsonFile } from "../exporters/json-download-service";
import { saveMarkdownFile } from "../exporters/markdown-download-service";
import { exportPdfFromPopup, type PopupPdfExportResult } from "./pdf-export-action";
import { createPdfPreview, PdfPreviewPage } from "../preview/pdf-preview";
import { exportConversationToPdf } from "../exporters/pdf-exporter";
import type { PdfTemplateId } from "../exporters/pdf-template";
import { exportJsonFromPopup, type PopupJsonExportResult } from "./json-export-action";
import { exportMarkdownFromPopup, type PopupMarkdownExportResult } from "./markdown-export-action";
import {
  MESSAGE_TYPE,
  type ConversationParsedMessage,
  type PageStatus,
  type PageStatusMessage,
} from "../shared/messages";

type PopupState =
  | { kind: "loading" }
  | { kind: "parsing"; status: PageStatus }
  | { kind: "success"; status: PageStatus; conversation: Conversation }
  | { kind: "empty"; status: PageStatus; reason: string }
  | { kind: "error"; status: PageStatus; reason: string }
  | { kind: "unsupported"; reason: string };

export function PopupApp() {
  const [state, setState] = useState<PopupState>({ kind: "loading" });
  const [markdownExport, setMarkdownExport] = useState<"idle" | "exporting" | PopupMarkdownExportResult>("idle");
  const [jsonExport, setJsonExport] = useState<"idle" | "exporting" | PopupJsonExportResult>("idle");
  const [pdfExport, setPdfExport] = useState<"idle" | "generating" | PopupPdfExportResult>("idle");
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplateId>("default");

  useEffect(() => {
    void loadConversation();
  }, []);

  async function loadConversation() {
    setState({ kind: "loading" });
    let pageStatus: PageStatus | undefined;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        setState({ kind: "unsupported", reason: "The active tab could not be read." });
        return;
      }

      const pageResponse = (await chrome.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPE.getPageStatus,
      })) as PageStatusMessage;
      if (pageResponse.type !== MESSAGE_TYPE.pageStatus || pageResponse.payload.platform !== "chatgpt") {
        setState({ kind: "unsupported", reason: "Open a readable ChatGPT conversation, then try again." });
        return;
      }

      pageStatus = pageResponse.payload;
      setState({ kind: "parsing", status: pageStatus });

      const parseResponse = (await chrome.tabs.sendMessage(tab.id, {
        type: MESSAGE_TYPE.parseConversation,
      })) as ConversationParsedMessage;
      if (parseResponse.type !== MESSAGE_TYPE.conversationParsed) {
        setState({ kind: "error", status: pageStatus, reason: "The conversation parser returned an unexpected response." });
        return;
      }

      const result = parseResponse.payload;
      if (result.status === "success") {
        setState({ kind: "success", status: pageStatus, conversation: result.conversation });
        return;
      }
      if (result.status === "empty") {
        setState({ kind: "empty", status: pageStatus, reason: result.reason });
        return;
      }
      if (result.status === "unsupported") {
        setState({ kind: "unsupported", reason: result.reason });
        return;
      }
      setState({ kind: "error", status: pageStatus, reason: result.reason });
    } catch {
      if (pageStatus) {
        setState({ kind: "error", status: pageStatus, reason: "The conversation could not be parsed safely." });
        return;
      }
      setState({ kind: "unsupported", reason: "The current page could not be reached by ExportAI." });
    }
  }

  async function handleMarkdownExport(conversation: Conversation) {
    setMarkdownExport("exporting");
    setMarkdownExport(await exportMarkdownFromPopup(conversation, saveMarkdownFile));
  }

  async function handleJsonExport(conversation: Conversation) {
    setJsonExport("exporting");
    setJsonExport(await exportJsonFromPopup(conversation, saveJsonFile));
  }

  async function handlePdfExport(conversation: Conversation) {
    setPdfExport("generating");
    setPdfExport(await exportPdfFromPopup(conversation, exportConversationToPdf, createPdfPreview, pdfTemplate));
  }

  function platformRow(status: PageStatus) {
    return (
      <div>
        <dt className="text-slate-500">Current platform</dt>
        <dd className="mt-1 font-medium">{status.platform ? getPlatformLabel(status.platform) : "Unknown"}</dd>
      </div>
    );
  }

  return (
    <main className="min-h-[320px] w-[360px] bg-slate-50 p-5 text-slate-900">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Local conversation export</p>
        <h1 className="mt-1 text-2xl font-semibold">ExportAI</h1>
      </header>

      {state.kind === "loading" && <p className="mt-8 text-sm text-slate-600">Detecting the current platform...</p>}

      {state.kind === "unsupported" && (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-medium">Unsupported</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{state.reason}</p>
          <button className="mt-4 text-sm font-medium text-indigo-700" onClick={() => void loadConversation()} type="button">Try again</button>
        </section>
      )}

      {state.kind === "parsing" && (
        <section className="mt-7 rounded-xl border border-slate-200 bg-white p-4">
          <dl className="space-y-3 text-sm">
            {platformRow(state.status)}
            <div><dt className="text-slate-500">Status</dt><dd className="mt-1 font-medium">Parsing conversation...</dd></div>
          </dl>
        </section>
      )}

      {state.kind === "success" && (
        <section className="mt-7 rounded-xl border border-slate-200 bg-white p-4">
          <dl className="space-y-3 text-sm">
            {platformRow(state.status)}
            <div><dt className="text-slate-500">Conversation title</dt><dd className="mt-1 font-medium">{state.conversation.title}</dd></div>
            <div><dt className="text-slate-500">Message count</dt><dd className="mt-1 font-medium">{state.conversation.metadata.messageCount}</dd></div>
          </dl>
          <button
            className="mt-4 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={markdownExport === "exporting"}
            onClick={() => void handleMarkdownExport(state.conversation)}
            type="button"
          >
            {markdownExport === "exporting" ? "Exporting Markdown..." : "Export Markdown"}
          </button>
          <button
            className="ml-2 mt-4 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={jsonExport === "exporting"}
            onClick={() => void handleJsonExport(state.conversation)}
            type="button"
          >
            {jsonExport === "exporting" ? "Exporting JSON..." : "Export JSON"}
          </button>
          <button
            className="ml-2 mt-4 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={pdfExport === "generating"}
            onClick={() => void handlePdfExport(state.conversation)}
            type="button"
          >
            {pdfExport === "generating" ? "Generating PDF..." : "Export PDF"}
          </button>
          <label className="ml-2 text-sm text-slate-600">
            Template
            <select className="ml-1 rounded border border-slate-300 px-1 py-1" value={pdfTemplate} onChange={(event) => setPdfTemplate(event.target.value as PdfTemplateId)}>
              <option value="default">Default</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          {typeof markdownExport === "object" && markdownExport.status === "success" && (
            <p className="mt-3 text-sm text-emerald-700" role="status">Markdown download started: {markdownExport.filename}</p>
          )}
          {typeof markdownExport === "object" && markdownExport.status === "error" && (
            <p className="mt-3 text-sm text-rose-700" role="alert">{markdownExport.reason}</p>
          )}
          {typeof jsonExport === "object" && jsonExport.status === "success" && (
            <p className="mt-3 text-sm text-emerald-700" role="status">JSON download started: {jsonExport.filename}</p>
          )}
          {typeof jsonExport === "object" && jsonExport.status === "error" && (
            <p className="mt-3 text-sm text-rose-700" role="alert">{jsonExport.reason}</p>
          )}
          {typeof pdfExport === "object" && pdfExport.status === "success" && (
            <>
              <p className="mt-3 text-sm text-emerald-700" role="status">PDF preview ready: {pdfExport.filename}</p>
              <div className="mt-4 h-64 overflow-auto">
                <PdfPreviewPage
                  filename={pdfExport.filename}
                  pdfBytes={pdfExport.pdfBytes}
                  resource={pdfExport.preview}
                  template={pdfTemplate}
                />
              </div>
            </>
          )}
          {typeof pdfExport === "object" && pdfExport.status === "error" && (
            <p className="mt-3 text-sm text-rose-700" role="alert">{pdfExport.code}</p>
          )}
        </section>
      )}

      {(state.kind === "empty" || state.kind === "error") && (
        <section className="mt-7 rounded-xl border border-slate-200 bg-white p-4">
          <dl className="space-y-3 text-sm">
            {platformRow(state.status)}
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="mt-1 font-medium">{state.kind === "empty" ? "Empty conversation" : "Parse error"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-6 text-slate-600">{state.reason}</p>
          <button className="mt-4 text-sm font-medium text-indigo-700" onClick={() => void loadConversation()} type="button">Try again</button>
        </section>
      )}
    </main>
  );
}
