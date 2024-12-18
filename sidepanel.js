document.addEventListener("DOMContentLoaded", function () {
  getCurrentTab(function (tab) {
    chrome.tabs.sendMessage(
      tab.id,
      { action: "getPageInfo" },
      function (response) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
        }
        if (response) {
          updatePageInfo(response.title);
        }
      }
    );
  });

  loadHighlights();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "highlightAdded") {
      addHighlightToUI(message.highlight);
    }
  });
});

function getCurrentTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    callback(tabs[0]);
  });
}

function updatePageInfo(title) {
  const titleElement = document.querySelector(".page-title");
  const dateElement = document.getElementById("date");

  titleElement.textContent = title || "Unknown Page";
  dateElement.textContent = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function loadHighlights() {
  chrome.storage.local.get(["highlights"], function (result) {
    const highlights = result.highlights || [];
    const container = document.getElementById("highlights-container");
    const highlightsCount = document.getElementById("highlights-count");

    highlightsCount.textContent = `${highlights.length} highlights`;
    container.innerHTML = "";

    highlights.forEach((highlight) => {
      addHighlightToUI(highlight);
    });
  });
}

function addHighlightToUI(highlight) {
  const container = document.getElementById("highlights-container");
  const highlightElement = createHighlightElement(highlight);
  container.insertBefore(highlightElement, container.firstChild);

  const highlightsCount = document.getElementById("highlights-count");
  const currentCount = parseInt(highlightsCount.textContent);
  highlightsCount.textContent = `${currentCount + 1} highlights`;
}

function createHighlightElement(highlight) {
  const div = document.createElement("div");
  div.className = "highlight-item";

  div.innerHTML = `
        <div class="highlight-text">${highlight.text}</div>
        ${
          highlight.notes
            ? `<div class="highlight-note">${highlight.notes}</div>`
            : ""
        }
        <input type="text" class="note-input" placeholder="Take a note..." 
               data-timestamp="${highlight.timestamp}">
        <button class="delete-button" aria-label="Delete highlight">×</button>
    `;

  div.addEventListener("click", function (e) {
    if (
      !e.target.classList.contains("note-input") &&
      !e.target.classList.contains("delete-button")
    ) {
      chrome.runtime.sendMessage({
        action: "openHighlight",
        url: highlight.url,
        text: highlight.text,
      });
    }
  });

  const noteInput = div.querySelector(".note-input");
  noteInput.addEventListener("change", function () {
    updateHighlightNote(highlight.timestamp, noteInput.value);
  });

  const deleteButton = div.querySelector(".delete-button");
  deleteButton.addEventListener("click", function (e) {
    e.stopPropagation();
    deleteHighlight(highlight.timestamp);
  });

  return div;
}

function updateHighlightNote(timestamp, note) {
  chrome.storage.local.get(["highlights"], function (result) {
    const highlights = result.highlights || [];
    const highlightIndex = highlights.findIndex(
      (h) => h.timestamp === timestamp
    );

    if (highlightIndex !== -1) {
      highlights[highlightIndex].notes = note;
      chrome.storage.local.set({ highlights: highlights }, function () {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        } else {
          loadHighlights();
        }
      });
    }
  });
}

function deleteHighlight(timestamp) {
  chrome.storage.local.get(["highlights", "highlightCount"], function (result) {
    const highlights = result.highlights || [];
    const currentCount = result.highlightCount || highlights.length;
    const updatedHighlights = highlights.filter(
      (h) => h.timestamp !== timestamp
    );

    chrome.storage.local.set(
      {
        highlights: updatedHighlights,
        highlightCount: Math.max(0, currentCount - 1),
      },
      function () {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        } else {
          loadHighlights();
        }
      }
    );
  });
}
