chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["highlights"], function (result) {
    if (!result.highlights) {
      chrome.storage.local.set({ highlights: [] });
    }
  });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveHighlight") {
    chrome.storage.local.get(["highlights"], function (result) {
      const highlights = result.highlights || [];
      highlights.push({
        text: message.text,
        url: message.url,
        title: message.title,
        timestamp: message.timestamp,
        notes: "",
      });
      chrome.storage.local.set({ highlights: highlights }, () => {
        sendResponse({ success: true });
        // Notify the side panel about the new highlight
        chrome.runtime.sendMessage({
          action: "highlightAdded",
          highlight: highlights[highlights.length - 1],
        });
      });
    });
    return true; // Indicates that the response is sent asynchronously
  } else if (message.action === "openHighlight") {
    chrome.tabs.create({ url: message.url }, function (tab) {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.sendMessage(tabId, {
            action: "highlightText",
            text: message.text,
          });
          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
    });
  } else if (message.action === "getPageInfo") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "getPageInfo" },
          function (response) {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError);
              sendResponse({ title: "Unknown Page" });
            } else if (response) {
              sendResponse(response);
            }
          }
        );
      } else {
        sendResponse({ title: "Unknown Page" });
      }
    });
    return true; // Indicates that the response is sent asynchronously
  }
});
