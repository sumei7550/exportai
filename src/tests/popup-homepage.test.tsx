// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PopupApp } from "../popup/popup-app";
import { MESSAGE_TYPE } from "../shared/messages";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
beforeEach(() => { vi.useFakeTimers(); });
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; document.body.replaceChildren(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("Popup homepage export trigger", () => {
  it("loads the homepage without querying or parsing the active page", async () => {
    const query = vi.fn();
    const sendMessage = vi.fn();
    vi.stubGlobal("chrome", { tabs: { query, sendMessage } });
    const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<PopupApp />); await Promise.resolve(); });
    expect(container.textContent).toContain("Export Format");
    expect(container.textContent).not.toContain("Conversation title");
    expect(container.textContent).not.toContain("Message count");
    expect(container.textContent).not.toContain("Current platform");
    expect(query).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("sends an export request only after a format card is clicked", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn();
    vi.stubGlobal("chrome", { tabs: { query: vi.fn().mockResolvedValue([{ id: 7, url: "https://chatgpt.com/c/123" }]), sendMessage } });
    vi.stubGlobal("close", close);
    const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<PopupApp />); await Promise.resolve(); });
    expect(sendMessage).not.toHaveBeenCalled();
    await act(async () => { container.querySelector("button[aria-label='PDF']")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await Promise.resolve(); });
    expect(sendMessage).toHaveBeenCalledWith(7, { type: MESSAGE_TYPE.exportRequest, format: "PDF" });
    expect(close).toHaveBeenCalledOnce();
  });

  it("shows an empty-page toast and keeps the popup open", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ status: "empty" });
    const close = vi.fn();
    vi.stubGlobal("chrome", { tabs: { query: vi.fn().mockResolvedValue([{ id: 7, url: "https://chatgpt.com/" }]), sendMessage } });
    vi.stubGlobal("close", close);
    const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<PopupApp />); await Promise.resolve(); });
    await act(async () => { container.querySelector("button[aria-label='PDF']")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await Promise.resolve(); });
    expect(container.querySelector("[role='status']")?.textContent).toContain("Please go to chat page to use export features");
    expect(close).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(2500); });
    expect(container.querySelector("[role='status']")).toBeNull();
  });

  it("delegates unsupported pages to the content script without showing a duplicate notice or closing", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn();
    vi.stubGlobal("chrome", { tabs: { query: vi.fn().mockResolvedValue([{ id: 7, url: "https://example.com/article" }]), sendMessage } });
    vi.stubGlobal("close", close);
    const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<PopupApp />); await Promise.resolve(); });
    await act(async () => { container.querySelector("button[aria-label='PDF']")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await Promise.resolve(); });
    expect(container.querySelector("[role='status']")).toBeNull();
    expect(sendMessage).toHaveBeenCalledWith(7, { type: MESSAGE_TYPE.exportRequest, format: "PDF" });
    expect(close).not.toHaveBeenCalled();
  });

  it("shows a fallback notice when an ordinary webpage has no content script", async () => {
    const sendMessage = vi.fn().mockRejectedValue(new Error("Could not establish connection"));
    const close = vi.fn();
    vi.stubGlobal("chrome", { tabs: { query: vi.fn().mockResolvedValue([{ id: 7, url: "https://www.google.com/search?q=exportai" }]), sendMessage } });
    vi.stubGlobal("close", close);
    const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<PopupApp />); await Promise.resolve(); });
    await act(async () => { container.querySelector("button[aria-label='PDF']")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await Promise.resolve(); });
    expect(container.querySelector("[role='status']")?.textContent).toContain("Please use on supported AI chat websites");
    expect(close).not.toHaveBeenCalled();
    expect(container.querySelector("[role='status']")?.textContent).not.toContain("Processing");
    await act(async () => { vi.advanceTimersByTime(2500); });
    expect(container.querySelector("[role='status']")).toBeNull();
  });

  it("replaces the existing toast timer when clicked repeatedly", async () => {
    const sendMessage = vi.fn().mockRejectedValue(new Error("Could not establish connection"));
    vi.stubGlobal("chrome", { tabs: { query: vi.fn().mockResolvedValue([{ id: 7, url: "https://www.google.com/search?q=exportai" }]), sendMessage } });
    vi.stubGlobal("close", vi.fn());
    const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<PopupApp />); await Promise.resolve(); });
    const pdfButton = container.querySelector("button[aria-label='PDF']");
    await act(async () => { pdfButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });
    await act(async () => { vi.advanceTimersByTime(2000); });
    await act(async () => { pdfButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });
    expect(container.querySelectorAll("[role='status']")).toHaveLength(1);
    await act(async () => { vi.advanceTimersByTime(2500); });
    expect(container.querySelector("[role='status']")).toBeNull();
  });

  it("shows the same fallback notice on chrome:// pages", async () => {
    const sendMessage = vi.fn().mockRejectedValue(new Error("Cannot access a chrome:// URL"));
    const close = vi.fn();
    vi.stubGlobal("chrome", { tabs: { query: vi.fn().mockResolvedValue([{ id: 7, url: "chrome://settings" }]), sendMessage } });
    vi.stubGlobal("close", close);
    const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<PopupApp />); await Promise.resolve(); });
    await act(async () => { container.querySelector("button[aria-label='JSON']")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await Promise.resolve(); });
    expect(container.querySelector("[role='status']")?.textContent).toContain("Please use on supported AI chat websites");
    expect(close).not.toHaveBeenCalled();
  });

  it("expands All AI Platforms without showing a coming-soon toast", async () => {
    vi.stubGlobal("chrome", { tabs: { query: vi.fn(), sendMessage: vi.fn() } });
    const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<PopupApp />); await Promise.resolve(); });
    await act(async () => { container.querySelector("button[aria-label='More platforms']")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(container.querySelector(".popup-platform-expanded")?.textContent).toContain("All AI Platforms");
    expect(container.querySelectorAll(".popup-all-platform")).toHaveLength(15);
    expect(container.querySelector("[role='status']")).toBeNull();
    expect(container.querySelector("[aria-label='Collapse platforms']")).toBeTruthy();
  });

  it("does not render the removed conversation UI or Popup modal", async () => {
    vi.stubGlobal("chrome", { tabs: { query: vi.fn(), sendMessage: vi.fn() } });
    const container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<PopupApp />); await Promise.resolve(); });
    expect(container.querySelector(".popup-state-card")).toBeNull();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector("button:not(.popup-format-card)[aria-label='PDF']")).toBeNull();
    expect(container.textContent).not.toContain("Template");
  });
});
