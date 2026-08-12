import { detectPlatformFromHostname } from "../constants/platforms";
import { MESSAGE_TYPE, type GetPageStatusMessage, type PageStatus } from "../shared/messages";

function createPageStatus(): PageStatus {
  return {
    platform: detectPlatformFromHostname(window.location.hostname),
    pageUrl: window.location.href,
  };
}

chrome.runtime.onMessage.addListener((message: GetPageStatusMessage, _sender, sendResponse) => {
  if (message.type !== MESSAGE_TYPE.getPageStatus) return;
  sendResponse({ type: MESSAGE_TYPE.pageStatus, payload: createPageStatus() });
});