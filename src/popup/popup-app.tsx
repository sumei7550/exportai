import { useEffect, useRef, useState } from "react";
import { detectPlatformFromHostname } from "../constants/platforms";
import { MESSAGE_TYPE, type ExportFormatMessage, type ExportRequestResponse } from "../shared/messages";
import logoUrl from "../assets/icons/logo/exportai-logo.png";
import chatgptUrl from "../assets/icons/chatgpt.svg";
import geminiUrl from "../assets/icons/gemini.svg";
import claudeUrl from "../assets/icons/claude.svg";
import grokUrl from "../assets/icons/grok.svg";
import deepseekUrl from "../assets/icons/deepseek.svg";
import kimiUrl from "../assets/icons/kimi.svg";
import qwenUrl from "../assets/icons/qwen.svg";
import doubaoUrl from "../assets/icons/doubao.png";
import perplexityUrl from "../assets/icons/perplexity.svg";
import notebookUrl from "../assets/icons/notebooklm.svg";
import copilotUrl from "../assets/icons/copilot.svg";
import googleAiStudioUrl from "../assets/icons/googleaistudio.svg";
import githubCopilotUrl from "../assets/icons/githubcopilot.svg";
import yuanbaoUrl from "../assets/icons/yuanbao.svg";
import searchUrl from "../assets/icons/googlesearch.svg";
import pdfUrl from "../assets/icons/pdf.png";
import markdownUrl from "../assets/icons/markdown.png";
import jsonUrl from "../assets/icons/json.png";
import docxUrl from "../assets/icons/docx.svg";
import imageUrl from "../assets/icons/image.png";
import textUrl from "../assets/icons/text.png";
import lightbulbUrl from "../assets/icons/lightbulb.svg";

export function PopupApp() {
  const [comingSoonMessage, setComingSoonMessage] = useState<string>();
  const toastTimerRef = useRef<number | undefined>(undefined);
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  useEffect(() => () => {
    if (toastTimerRef.current !== undefined) window.clearTimeout(toastTimerRef.current);
  }, []);
  function showToast(message: string) {
    if (toastTimerRef.current !== undefined) window.clearTimeout(toastTimerRef.current);
    setComingSoonMessage(message);
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = undefined;
      setComingSoonMessage(undefined);
    }, 2500);
  }
  function showComingSoon(name: string) { showToast(`${name} is coming soon.`); }
  function showUnsupportedPageNotice() { showToast("Please use on supported AI chat websites"); }
  function openPlatform(name: string) { if (name === "ChatGPT") { window.open("https://chat.openai.com", "_blank", "noopener,noreferrer"); return; } setShowAllPlatforms(false); showComingSoon(name); }
  function requestExport(format: ExportFormatMessage["format"]) {
    void chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
      const pageUrl = tab?.url;
      let hostname: string | undefined;
      try { hostname = pageUrl ? new URL(pageUrl).hostname : undefined; } catch { hostname = undefined; }
      if (!tab.id) {
        showUnsupportedPageNotice();
        return;
      }
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPE.exportRequest, format }) as ExportRequestResponse | undefined;
        if (response?.status === "empty") {
          showToast("Please go to chat page to use export features");
          return;
        }
      } catch {
        showUnsupportedPageNotice();
        return;
      }
      if (hostname && detectPlatformFromHostname(hostname) !== null) window.close();
    }).catch(showUnsupportedPageNotice);
  }
  function formatButton(name: "PDF" | "Markdown" | "JSON" | "Text" | "Docx" | "Image", icon: string) { const available = name === "PDF" || name === "Markdown" || name === "JSON"; return <button aria-label={name} className={`popup-format-card ${available ? "popup-format-card-available" : "popup-format-card-disabled"}`} onClick={() => available ? requestExport(name) : showComingSoon(name)} type="button"><img alt="" className="popup-format-icon" src={icon} /><span><span className="sr-only">Export </span>{name}</span></button>; }
  const platforms = [["ChatGPT", chatgptUrl], ["Gemini", geminiUrl], ["Claude", claudeUrl], ["NotebookLM", notebookUrl], ["Grok", grokUrl], ["DeepSeek", deepseekUrl], ["Perplexity", perplexityUrl], ["Kimi", kimiUrl], ["Qwen", qwenUrl], ["DouBao", doubaoUrl], ["Google AI Studio", googleAiStudioUrl], ["Google Search", searchUrl], ["Copilot", copilotUrl], ["Github Copilot", githubCopilotUrl], ["YuanBao", yuanbaoUrl]] as const;
  return <main className="popup-shell"><header className="popup-header"><img alt="ExportAI" className="popup-logo" src={logoUrl} /><h1>ExportAI</h1></header><section aria-labelledby="platform-heading" className="popup-section">{showAllPlatforms ? <div className="popup-platform-expanded"><div className="popup-platform-expanded-header" id="platform-heading"><h2>All AI Platforms</h2><button aria-label="Collapse platforms" className="popup-platform-collapse" onClick={() => setShowAllPlatforms(false)} type="button">Less</button></div><div className="popup-platform-grid">{platforms.map(([name, icon]) => <button key={name} className="popup-all-platform" onClick={() => openPlatform(name)} type="button"><img alt={name} src={icon} /><span>{name}</span></button>)}</div></div> : <><h2 id="platform-heading">AI Platform</h2><div className="popup-platform-scroller">{platforms.slice(0, 6).map(([name, icon]) => <button key={name} aria-label={name} className="popup-platform-card" onClick={() => openPlatform(name)} type="button"><img alt="" src={icon} /></button>)}<button aria-label="More platforms" className="popup-platform-card popup-platform-more" onClick={() => setShowAllPlatforms(true)} type="button"><span className="popup-more-dots" aria-hidden="true">•••</span><span className="popup-more-label">More</span></button></div></>}</section>{!showAllPlatforms && <><section aria-labelledby="format-heading" className="popup-section"><h2 id="format-heading">Export Format</h2><div className="popup-card-grid popup-format-grid">{formatButton("PDF", pdfUrl)}{formatButton("Markdown", markdownUrl)}{formatButton("JSON", jsonUrl)}{formatButton("Text", textUrl)}{formatButton("Docx", docxUrl)}{formatButton("Image", imageUrl)}</div></section>{comingSoonMessage && <p className="popup-notice" role="status"><span className="popup-notice-icon" aria-hidden="true">!</span><span>{comingSoonMessage}</span></p>}<p className="popup-tip"><img alt="" className="popup-tip-icon" src={lightbulbUrl} /><span>Long conversations may take a little longer to export.</span></p></>}</main>;
}
