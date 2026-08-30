import { useEffect, useState } from "react";

export type ExportFormat = "Markdown" | "JSON" | "PDF";

export type ExportFlowState =
  | { status: "idle" }
  | { status: "processing"; format: ExportFormat }
  | { status: "success"; format: ExportFormat; filename: string }
  | { status: "error"; format: ExportFormat; reason: string };

const PROCESSING_MESSAGES = [
  "Working on it...",
  "Longer chats may take a bit more time...",
  "Formatting your content...",
  "Almost there...",
  "Please keep this tab open...",
] as const;

interface ExportFlowModalProps {
  state: ExportFlowState;
  onClose: () => void;
}

export function ExportFlowModal({ state, onClose }: ExportFlowModalProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (state.status !== "processing") {
      setMessageIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % PROCESSING_MESSAGES.length);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [state.status]);

  if (state.status === "idle") return null;

  const isProcessing = state.status === "processing";
  const title = isProcessing ? "Processing, Please wait..." : state.status === "success" ? "Export Success!" : "Export Failed";

  function handleOverlayMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (!isProcessing && event.target === event.currentTarget) onClose();
  }

  return (
    <div
      aria-label="Export flow"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-5"
      onMouseDown={handleOverlayMouseDown}
      role="dialog"
      aria-modal="true"
    >
      <section className="relative w-full max-w-md rounded-2xl bg-white px-8 py-9 text-center shadow-xl">
        {!isProcessing && (
          <button
            aria-label="Close export message"
            className="absolute right-3 top-3 rounded p-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        )}
        {state.status === "success" && <div aria-hidden="true" className="mb-4 text-5xl leading-none">🎉</div>}
        <h2 className={state.status === "success" ? "text-3xl font-bold text-slate-900" : "text-lg font-semibold text-slate-900"}>{title}</h2>
        {isProcessing ? (
          <>
            <div aria-label="Export in progress" className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" role="status" />
            <p aria-live="polite" className="mt-4 text-sm text-slate-600">{PROCESSING_MESSAGES[messageIndex]}</p>
          </>
        ) : state.status === "success" ? (
          <>
            <p className="mt-4 text-base text-slate-600" role="status">Your file has been downloaded.</p>
            <button className="mt-6 inline-flex w-auto items-center rounded-lg bg-yellow-400 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-yellow-300" onClick={() => window.open("https://ko-fi.com/sumei7550", "_blank", "noopener,noreferrer")} type="button">☕&nbsp; Buy me a coffee</button>
          </>
        ) : (
          <p className="mt-4 text-sm text-rose-700" role="alert">{state.reason}</p>
        )}
      </section>
    </div>
  );
}

export { PROCESSING_MESSAGES };
