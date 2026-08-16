import { ChatGPTAdapter } from "../adapters/chatgpt/chatgpt-adapter";
import { detectPlatformFromHostname } from "../constants/platforms";
import { MESSAGE_TYPE, type ContentScriptRequest, type PageStatus } from "../shared/messages";

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
});
