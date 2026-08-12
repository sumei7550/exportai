import { useEffect, useState } from "react";
import { getPlatformLabel } from "../constants/platforms";
import { MESSAGE_TYPE, type PageStatus, type PageStatusMessage } from "../shared/messages";

type PopupState =
  | { kind: "loading" }
  | { kind: "supported"; status: PageStatus }
  | { kind: "unsupported" };

export function PopupApp() {
  const [state, setState] = useState<PopupState>({ kind: "loading" });

  useEffect(() => {
    void loadPageStatus();
  }, []);

  async function loadPageStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        setState({ kind: "unsupported" });
        return;
      }
      const response = (await chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPE.getPageStatus })) as PageStatusMessage;
      if (response.payload.platform) {
        setState({ kind: "supported", status: response.payload });
        return;
      }
      setState({ kind: "unsupported" });
    } catch {
      setState({ kind: "unsupported" });
    }
  }

  return (
    <main className="min-h-[320px] w-[360px] bg-slate-50 p-5 text-slate-900">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Local conversation export</p>
        <h1 className="mt-1 text-2xl font-semibold">ExportAI</h1>
      </header>
      {state.kind === "loading" && <p className="mt-8 text-sm text-slate-600">Detecting the current platform…</p>}
      {state.kind === "unsupported" && (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-medium">This page is not supported</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Open ChatGPT, Claude, or Gemini, then try again.</p>
          <button className="mt-4 text-sm font-medium text-indigo-700" onClick={() => void loadPageStatus()} type="button">Try again</button>
        </section>
      )}
      {state.kind === "supported" && state.status.platform && (
        <section className="mt-7 rounded-xl border border-slate-200 bg-white p-4">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-slate-500">Current platform</dt><dd className="mt-1 font-medium">{getPlatformLabel(state.status.platform)}</dd></div>
            <div><dt className="text-slate-500">Status</dt><dd className="mt-1 font-medium">Platform detected. Conversation parsing is introduced in Phase 3.</dd></div>
          </dl>
        </section>
      )}
    </main>
  );
}