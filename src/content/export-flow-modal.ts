export type PageExportFlowState =
  | { status: "idle" }
  | { status: "processing"; format: string }
  | { status: "success"; format: string; filename: string }
  | { status: "error"; format: string; reason: string };

const PROCESSING_MESSAGES = [
  "Working on it...",
  "Longer chats may take a bit more time...",
  "Formatting your content...",
  "Almost there...",
  "Please keep this tab open...",
] as const;

const ROOT_ID = "exportai-page-modal";
const TOAST_ID = "exportai-page-toast";
let intervalId: number | undefined;

function removeModal(): void {
  if (intervalId !== undefined) window.clearInterval(intervalId);
  intervalId = undefined;
  document.getElementById(ROOT_ID)?.remove();
}

export function renderExportFlowModal(state: PageExportFlowState): void {
  removeModal();
  if (state.status === "idle") return;

  const overlay = document.createElement("div");
  overlay.id = ROOT_ID;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Export flow");
  Object.assign(overlay.style, { position: "fixed", inset: "0", zIndex: "2147483647", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "rgba(15, 23, 42, .42)", fontFamily: "system-ui, sans-serif" });

  const card = document.createElement("section");
  Object.assign(card.style, { position: "relative", width: state.status === "success" ? "min(100%, 440px)" : "min(100%, 380px)", boxSizing: "border-box", borderRadius: state.status === "success" ? "20px" : "16px", background: "#fff", padding: state.status === "success" ? "36px 32px 32px" : "24px", textAlign: "center", boxShadow: "0 20px 50px rgba(15, 23, 42, .24)", color: "#0f172a" });
  if (state.status === "success") {
    const celebration = document.createElement("div");
    celebration.textContent = "🎉";
    Object.assign(celebration.style, { fontSize: "56px", lineHeight: "1", marginBottom: "20px" });
    card.append(celebration);
  }
  const title = document.createElement("h2");
  title.textContent = state.status === "processing" ? "Processing, Please wait..." : state.status === "success" ? "Export Success!" : "Export Failed";
  Object.assign(title.style, { margin: "0", fontSize: state.status === "success" ? "28px" : "18px", lineHeight: "1.15", fontWeight: state.status === "success" ? "700" : "600" });
  card.append(title);

  if (state.status === "processing") {
    const spinner = document.createElement("div");
    spinner.setAttribute("role", "status"); spinner.setAttribute("aria-label", "Export in progress");
    Object.assign(spinner.style, { width: "32px", height: "32px", margin: "20px auto 0", border: "4px solid #e2e8f0", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "exportai-spin .8s linear infinite" });
    const message = document.createElement("p"); message.setAttribute("aria-live", "polite"); message.textContent = PROCESSING_MESSAGES[0];
    Object.assign(message.style, { margin: "16px 0 0", color: "#475569", fontSize: "14px" });
    card.append(spinner, message);
    const style = document.createElement("style"); style.textContent = "@keyframes exportai-spin { to { transform: rotate(360deg); } }"; card.append(style);
    let index = 0; intervalId = window.setInterval(() => { index = (index + 1) % PROCESSING_MESSAGES.length; message.textContent = PROCESSING_MESSAGES[index]; }, 3000);
  } else {
    const text = document.createElement("p"); text.textContent = state.status === "success" ? "Your file has been downloaded." : state.reason;
    Object.assign(text.style, { margin: "16px 0 0", color: state.status === "success" ? "#4b5563" : "#be123c", fontSize: state.status === "success" ? "16px" : "14px" });
    card.append(text);
    if (state.status === "success") { const coffee = document.createElement("button"); coffee.textContent = "☕  Buy me a coffee"; coffee.type = "button"; Object.assign(coffee.style, { display: "inline-flex", width: "auto", alignItems: "center", margin: "24px auto 0", padding: "12px 18px", border: "0", borderRadius: "10px", background: "#ffd000", color: "#111827", fontSize: "15px", fontWeight: "700", cursor: "pointer" }); coffee.onclick = () => window.open("https://example.com/buy-me-a-coffee", "_blank", "noopener,noreferrer"); card.append(coffee); }
    const close = document.createElement("button"); close.type = "button"; close.setAttribute("aria-label", "Close export message"); close.textContent = "×"; Object.assign(close.style, { position: "absolute", right: "16px", top: "12px", border: "0", background: "transparent", color: "#9ca3af", fontSize: "28px", lineHeight: "1", cursor: "pointer" }); close.onclick = removeModal; card.append(close);
    overlay.onmousedown = (event) => { if (event.target === overlay) removeModal(); };
  }
  overlay.append(card); document.body.append(overlay);
}

export function renderExportToast(message: string): void {
  document.getElementById(TOAST_ID)?.remove();
  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.setAttribute("role", "status");
  toast.textContent = message;
  Object.assign(toast.style, { position: "fixed", left: "50%", bottom: "24px", transform: "translateX(-50%)", zIndex: "2147483647", padding: "12px 16px", borderRadius: "8px", background: "#0f172a", color: "#fff", font: "14px system-ui, sans-serif" });
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 2500);
}
