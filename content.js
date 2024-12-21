let lastHighlightedText = "";
let tooltipElement = null;
let isTooltipClick = false;
let currentSelection = null;

document.addEventListener("mouseup", function (event) {
  if (isTooltipClick) {
    isTooltipClick = false;
    return;
  }

  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText && event.metaKey && event.shiftKey) {
    lastHighlightedText = selectedText;
    currentSelection = selection;
    showTooltip(event.clientX, event.clientY, selectedText);
  } else if (tooltipElement && !tooltipElement.contains(event.target)) {
    tooltipElement.remove();
    tooltipElement = null;
  }
});

function showTooltip(x, y, text) {
  if (tooltipElement) {
    tooltipElement.remove();
  }

  tooltipElement = document.createElement("div");
  tooltipElement.className = "infoverse-tooltip";
  tooltipElement.innerHTML = `
        <div id="infoverse-color-picker">
            <div class="color-option" data-color="#ffff00"></div>
            <div class="color-option" data-color="#00ff00"></div>
            <div class="color-option" data-color="#ff00ff"></div>
            <div class="color-option" data-color="#00ffff"></div>
        </div>
    `;
  tooltipElement.style.position = "fixed";
  tooltipElement.style.left = `${x}px`;
  tooltipElement.style.top = `${y}px`;
  tooltipElement.style.zIndex = "9999";
  tooltipElement.style.userSelect = "none";

  tooltipElement.addEventListener("mousedown", function () {
    isTooltipClick = true;
  });

  document.body.appendChild(tooltipElement);

  const colorPicker = document.getElementById("infoverse-color-picker");

  colorPicker.querySelectorAll(".color-option").forEach((option) => {
    option.addEventListener("click", function () {
      const color = this.dataset.color;
      wrapSelectedTextNodes(
        Math.random(),
        "infoverse-highlight-wrapper",
        color
      );

      chrome.runtime.sendMessage(
        {
          action: "saveHighlight",
          text: lastHighlightedText,
          url: window.location.href,
          title: document.title,
          timestamp: new Date().toISOString(),
          color: color,
        },
        function (response) {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
          } else {
            wrapSelectedTextNodes(
              Math.random(),
              "infoverse-highlight-wrapper",
              color
            );
          }
        }
      );
      tooltipElement.remove();
      tooltipElement = null;
    });
  });
}

function wrapSelectedTextNodes(id, className, color) {
  getSelectedTextNodes().forEach((selection, index) => {
    // console.log(selection);
    selection.forEach((textNode, nodeNumber) => {
      let span = document.createElement("span");
      if (nodeNumber == 0) span.id = id + "-" + index;
      else span.setAttribute("for", id + "-" + index);
      span.classList.add(className);
      span.style.backgroundColor = color;
      textNode.before(span);
      span.appendChild(textNode);
      console.log(span);
    });
  });
}

function getSelectedTextNodes() {
  let returnArray = new Array();
  let selection = window.getSelection();
  for (
    let rangeNumber = selection.rangeCount - 1;
    rangeNumber >= 0;
    rangeNumber--
  ) {
    console.log(selection.rangeCount);
    let rangeNodes = new Array();
    let range = selection.getRangeAt(rangeNumber);
    if (
      range.startContainer === range.endContainer &&
      range.endContainer.nodeType === Node.TEXT_NODE
    ) {
      range.startContainer.splitText(range.endOffset);
      let textNode = range.startContainer.splitText(range.startOffset);
      rangeNodes.push(textNode);
    } else {
      console.log(range.startContainer);
      let textIterator = document.createNodeIterator(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        (node) =>
          node.compareDocumentPosition(range.startContainer) ==
            Node.DOCUMENT_POSITION_PRECEDING &&
          node.compareDocumentPosition(range.endContainer) ==
            Node.DOCUMENT_POSITION_FOLLOWING
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT
      );
      while ((node = textIterator.nextNode())) {
        if (node.textContent.trim() != "") {
          rangeNodes.push(node);
        }
      }
      if (range.endContainer.nodeType === Node.TEXT_NODE) {
        range.endContainer.splitText(range.endOffset);
        rangeNodes.push(range.endContainer);
      }
      if (range.startContainer.nodeType === Node.TEXT_NODE) {
        rangeNodes.unshift(range.startContainer.splitText(range.startOffset));
      }
    }
    returnArray.unshift(rangeNodes);
  }
  return returnArray;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getPageInfo") {
    sendResponse({
      title: document.title,
      url: window.location.href,
    });
  } else if (message.action === "highlightText") {
    highlightSelection();
    sendResponse({ success: true });
  }
  return true;
});

function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");
  const bigint = parseInt(hex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function getColorNumber(color) {
  const colorMap = {
    "#ffff00": "3",
    "#00ff00": "2",
    "#ff00ff": "4",
    "#00ffff": "1",
  };
  return colorMap[color] || "3";
}

function generateUniqueId() {
  return "a" + Math.random().toString(36).substr(2, 4);
}

function mergeAdjacentHighlights(container) {
  const highlights = container.querySelectorAll(".infoverse-highlight-wrapper");

  for (let i = 0; i < highlights.length - 1; i++) {
    const current = highlights[i];
    const next = highlights[i + 1];

    if (
      current.getAttribute("highlightid") === next.getAttribute("highlightid")
    ) {
      next.insertBefore(current.firstChild, next.firstChild);
      current.remove();
    }
  }
}

const style = document.createElement("style");
style.textContent = `
    .infoverse-highlight-wrapper {
        padding: 0;
        margin: 0;
        border-radius: 2px;
    }
    .infoverse-tooltip {
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .infoverse-tooltip button {
        margin: 0 4px;
        padding: 4px 8px;
        border: none;
        background-color: #36c;
        color: white;
        cursor: pointer;
        border-radius: 4px;
    }
    .infoverse-tooltip button:hover {
        background-color: #447ff5;
    }
    #infoverse-color-picker {
        margin-top: 8px;
        display: flex;
        gap: 4px;
    }
    .color-option {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        cursor: pointer;
        border: 1px solid #ccc;
    }
    .color-option:hover {
        transform: scale(1.1);
    }
    .color-option[data-color="#ffff00"] { background-color: #ffff00; }
    .color-option[data-color="#00ff00"] { background-color: #00ff00; }
    .color-option[data-color="#ff00ff"] { background-color: #ff00ff; }
    .color-option[data-color="#00ffff"] { background-color: #00ffff; }
`;
document.head.appendChild(style);
