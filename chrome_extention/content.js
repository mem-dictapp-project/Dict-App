// content.js

// --- グローバル変数と要素の初期化 ---
let isIconEnabled = true; // Synchronous state for icon visibility

const termsJsonUrl = chrome.runtime.getURL("terms.json");
const translationPopupHost = document.createElement("div");
translationPopupHost.id = "md-text-translation-popup-host";
translationPopupHost.style.all = "initial";
translationPopupHost.style.position = "absolute";
translationPopupHost.style.zIndex = "2100000000"; // Max z-index
document.body.appendChild(translationPopupHost);

const shadowRoot = translationPopupHost.attachShadow({ mode: "open" });

// Create a wrapper element inside the shadow DOM to act as a reset boundary
const shadowWrapper = document.createElement("div");
shadowWrapper.id = "md-shadow-wrapper";
shadowRoot.appendChild(shadowWrapper);

// Create a single, reusable tooltip element and add it to the shadow DOM
const sharedTooltip = document.createElement("div");
sharedTooltip.className = "tooltip"; // Reuse existing styles
const sharedTooltipContent = document.createElement("div");
sharedTooltipContent.className = "tooltip-text";
sharedTooltip.appendChild(sharedTooltipContent);
shadowWrapper.appendChild(sharedTooltip);

// スタイルシートを動的に読み込み、Shadow DOMに適用
const styleUrl = chrome.runtime.getURL("styles.css");
fetch(styleUrl)
  .then((response) => response.text())
  .then((css) => {
    const style = document.createElement("style");
    style.textContent = css;
    shadowRoot.insertBefore(style, shadowWrapper); // Insert style before the wrapper
  });

const translationPopup = document.createElement("div");
translationPopup.id = "md-text-translation-popup";
shadowWrapper.appendChild(translationPopup);

const selectionIcon = document.createElement("img");
selectionIcon.id = "md-selection-icon";
selectionIcon.src = chrome.runtime.getURL("images/dict_icon_48.png");
selectionIcon.style.position = "absolute";
selectionIcon.style.zIndex = "99999";
selectionIcon.style.cursor = "pointer";
selectionIcon.style.width = "32px";
selectionIcon.style.height = "32px";
selectionIcon.style.display = "none";
document.body.appendChild(selectionIcon);

const INITIAL_MODAL_MAX_HEIGHT = 240;
let latestRequestId;
let lastSelectionRect = null;

// --- 初期化処理 ---

// Load the initial state of icon visibility from storage
chrome.storage.local.get({ iconVisibility: true }, (items) => {
  isIconEnabled = items.iconVisibility;
});


// --- ポップアップ内のイベント処理 ---
translationPopup.addEventListener("click", async (event) => {
  const showRelatedBtn = event.target.closest("#md-show-related-btn");
  if (showRelatedBtn) {
    const relatedTermsContainer = shadowRoot.querySelector(
      "#md-related-terms-container"
    );
    const modal = shadowRoot.querySelector(".md-modal");
    const computedStyle = window.getComputedStyle(relatedTermsContainer);

    if (computedStyle.display === "none") {
      const relatedTerms = translationPopup._relatedTerms;
      const allResults = translationPopup._allResults;

      if (relatedTerms && relatedTerms.length > 0) {
        relatedTermsContainer.innerHTML = ""; // Clear previous terms
        const list = document.createElement("ul");
        list.className = "md-related-list";

        relatedTerms.forEach((term) => {
          const listItem = document.createElement("li");
          if (term.abbreviation) {
            listItem.textContent = `${term.word}（${term.abbreviation}）`;
          } else {
            listItem.textContent = term.word;
          }
          listItem.className = "md-related-item";
          listItem.addEventListener("click", (event) => {
            event.stopPropagation();
            renderPopup(term, allResults);
          });
          list.appendChild(listItem);
        });

        relatedTermsContainer.appendChild(list);
        relatedTermsContainer.style.display = "block";
        showRelatedBtn.classList.add("rotated");

        const relatedTermsHeight = list.offsetHeight;
        const newMaxHeight = INITIAL_MODAL_MAX_HEIGHT + relatedTermsHeight;
        modal.style.maxHeight = `${newMaxHeight}px`;
      }
    } else {
      const newMaxHeight = INITIAL_MODAL_MAX_HEIGHT;
      modal.style.maxHeight = `${newMaxHeight}px`;
      relatedTermsContainer.style.display = "none";
      showRelatedBtn.classList.remove("rotated");
    }
  }

  const closeBtn = event.target.closest(".md-modal-close");
  if (closeBtn) {
    hidePopup();
  }
});

translationPopup.addEventListener("mouseover", (event) => {
  const wrapper = event.target.closest(".tooltip-wrapper");
  if (wrapper && wrapper.dataset.tooltip) {
    const tooltipText = wrapper.dataset.tooltip;
    sharedTooltipContent.innerHTML = tooltipText; // Use innerHTML to render <br>

    const hostRect = translationPopupHost.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    // Position tooltip relative to the translationPopupHost, which is the positioned ancestor
    const top = wrapperRect.bottom - hostRect.top + 10; // 10px below the wrapper
    const left = wrapperRect.left - hostRect.left + wrapperRect.width / 2; // Centered on the wrapper

    sharedTooltip.style.top = `${top}px`;
    sharedTooltip.style.left = `${left}px`;

    sharedTooltip.style.visibility = "visible";
    sharedTooltip.style.opacity = "1";
  }
});

translationPopup.addEventListener("mouseout", (event) => {
  const wrapper = event.target.closest(".tooltip-wrapper");
  if (wrapper && wrapper.dataset.tooltip) {
    sharedTooltip.style.visibility = "hidden";
    sharedTooltip.style.opacity = "0";
  }
});

// --- グローバルイベントリスナー ---
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.iconVisibility) {
    isIconEnabled = changes.iconVisibility.newValue;
    if (!isIconEnabled) {
      hideIcon();
    }
  }
});

document.addEventListener("mouseup", (event) => {
  const path = event.composedPath();
  if (path.includes(translationPopupHost) || event.target === selectionIcon) {
    return;
  }
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (isIconEnabled && selectedText.length >= 2 && selectedText.length <= 50) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return; // Ignore empty selections
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
      selectionIcon.style.left = `${rect.right + scrollLeft + 5}px`;
      selectionIcon.style.top = `${rect.top + scrollTop - 32}px`;
      selectionIcon.style.display = "block";
      selectionIcon.classList.add("visible");
      selectionIcon.dataset.selectedText = selectedText;
    } else {
      hideIcon();
    }
  }, 1);
});

selectionIcon.addEventListener("click", () => {
  const text = selectionIcon.dataset.selectedText;
  if (text) {
    startTranslation(text);
    hideIcon();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startTranslation") {
    const selectedText = request.text;
    if (selectedText && selectedText.trim().length > 0) {
      startTranslation(selectedText);
    }
  }
});

document.addEventListener("click", (event) => {
  const path = event.composedPath();
  if (path.includes(translationPopupHost) || path.includes(selectionIcon)) {
    return;
  }
  hidePopup();
  hideIcon();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hidePopup();
    hideIcon();
  }
});

// --- 関数定義 ---

async function sendMessageToGAS(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "fetchFromGAS", message: message },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "[sendMessageToGAS] Error sending message:",
            chrome.runtime.lastError.message
          );
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response && response.success) {
          const values = response.data.value;

          // valuesが配列であることを確認
          if (!Array.isArray(values)) {
            console.error(
              "[sendMessageToGAS] Response value is not an array:",
              values
            );
            resolve([]); // or resolve(null) depending on desired error handling
            return;
          }

          if (values.length === 0) {
            resolve([]);
            return;
          }

          // APIからのレスポンスを既存のデータ構造にマッピング
          const mappedValues = values.map((item) => ({
            word: item.A,
            abbreviation: item.B,
            is_memword: item.C,
            description: item.D,
            source_url: item.E,
          }));
          resolve(mappedValues);
        } else {
          console.error(
            "[sendMessageToGAS] API request failed:",
            response ? response.error : "No response"
          );
          resolve(null); // エラー時はnullを返す
        }
      }
    );
  });
}

async function getTermData(term) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ useApi: true }, async (items) => {
      // if (items.useApi) {
      if (true) {
        const results = await sendMessageToGAS(term);
        resolve(results);
      } else {
        // ローカルのJSONファイルから取得するロジック（既存の処理）
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 100; // ms

        for (let i = 0; i < MAX_RETRIES; i++) {
          try {
            const response = await fetch(termsJsonUrl);

            if (!response.ok) {
              console.error(
                `[getTermData] Failed to fetch terms.json with status: ${response.status}. Aborting retries.`
              );
              resolve(null);
              return;
            }

            const data = await response.json();
            if (data.results && data.results.length > 0) {
              resolve(data.results);
              return;
            }
            resolve(null);
            return;
          } catch (error) {
            console.error(
              `[getTermData] Attempt ${i + 1} of ${MAX_RETRIES} failed:`,
              error
            );
            if (i < MAX_RETRIES - 1) {
              await new Promise((resolve) =>
                setTimeout(resolve, RETRY_DELAY * (i + 1))
              );
            } else {
              console.error("[getTermData] All retry attempts failed.");
              resolve(null);
              return;
            }
          }
        }
        resolve(null);
      }
    });
  });
}

function startTranslation(text) {
  const selection = window.getSelection();
  const requestId = Date.now();
  latestRequestId = requestId;

  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    lastSelectionRect = range.getBoundingClientRect();
    const rect = lastSelectionRect;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    let top = rect.bottom + scrollTop + 10;
    const viewportHeight = document.documentElement.clientHeight;
    const loaderHeight = 80; // Approximate height of the loading indicator

    // If loader would go off-screen, and there's space above, place it above.
    if (
      rect.bottom + loaderHeight > viewportHeight &&
      rect.top > loaderHeight
    ) {
      top = rect.top + scrollTop - loaderHeight - 10;
    }
    translationPopupHost.style.left = `${rect.left + scrollLeft}px`;
    translationPopupHost.style.top = `${top}px`;
  }
  translationPopup.innerHTML = `
    <div class="md-loading-animation">
      <div class="md-dot-pulse"><div class="md-dot-pulse__dot"></div></div>
      <div class="md-loading-text">検索中...</div>
    </div>`;

  translationPopupHost.style.display = "block";
  requestAnimationFrame(() => {
    translationPopup.classList.add("visible");
  });

  sendTextForTranslation(text, requestId);
}

async function sendTextForTranslation(text, requestId) {
  let results = await getTermData(text);

  if (latestRequestId !== requestId) {
    return;
  }

  if (results && results.length > 0) {
    const mainResult = results[0];
    translationPopup.innerHTML = generatePopupHTML(mainResult);
    translationPopup._allResults = results;
    renderPopup(mainResult, results);
    positionAndShowPopup();
  } else {
    translationPopup.innerHTML = generateNoResultHTML();
    positionAndShowPopup();
  }
}

function renderPopup(mainTerm, allResults) {
  const modal = shadowRoot.querySelector(".md-modal");
  if (modal) {
    modal.scrollTop = 0;
  }

  const { word, abbreviation, description, is_memword, source_url } = mainTerm;
  shadowRoot.querySelector(".md-modal-title").textContent = word;
  shadowRoot.querySelector(".md-modal-subtitle").textContent = abbreviation;
  shadowRoot.querySelector(".md-modal-description p").textContent = description;
  const tagsContainer = shadowRoot.querySelector(".md-modal-tags");
  if (is_memword) {
    tagsContainer.innerHTML = '<span class="md-tag">#MEM用語</span>';
  } else {
    tagsContainer.innerHTML = "";
  }
  const referenceLinkContainer = shadowRoot.querySelector(
    ".md-reference-link-container"
  );
  if (referenceLinkContainer) {
    if (source_url) {
      referenceLinkContainer.innerHTML = `<a href="${source_url}" class="md-reference-link" target="_blank">参考リンク</a>`;
    } else {
      referenceLinkContainer.innerHTML = "";
    }
  }

  const originalMainResult = allResults[0];
  let relatedTerms;
  if (mainTerm === originalMainResult) {
    relatedTerms = allResults.slice(1);
  } else {
    relatedTerms = [
      originalMainResult,
      ...allResults.filter((t) => t !== mainTerm && t !== originalMainResult),
    ];
  }
  translationPopup._relatedTerms = relatedTerms;

  const relatedTermsContainer = shadowRoot.querySelector(
    "#md-related-terms-container"
  );
  if (relatedTermsContainer.style.display !== "none") {
    relatedTermsContainer.innerHTML = "";
    const list = document.createElement("ul");
    list.className = "md-related-list";

    relatedTerms.forEach((term) => {
      const listItem = document.createElement("li");
      if (term.abbreviation) {
        listItem.textContent = `${term.word}（${term.abbreviation}）`;
      } else {
        listItem.textContent = term.word;
      }
      listItem.className = "md-related-item";
      listItem.addEventListener("click", (event) => {
        event.stopPropagation();
        renderPopup(term, allResults);
      });
      list.appendChild(listItem);
    });
    relatedTermsContainer.appendChild(list);
  }

  if (modal) {
    if (relatedTermsContainer.style.display === "none") {
      modal.style.maxHeight = `${INITIAL_MODAL_MAX_HEIGHT}px`;
    } else {
      const list = relatedTermsContainer.querySelector("ul");
      if (list) {
        const relatedTermsHeight = list.offsetHeight;
        modal.style.maxHeight = `${
          INITIAL_MODAL_MAX_HEIGHT + relatedTermsHeight
        }px`;
      }
    }
  }

  const showRelatedBtn = shadowRoot.querySelector("#md-show-related-btn");
  if (relatedTerms.length > 0) {
    if (showRelatedBtn) showRelatedBtn.style.display = "block";
  } else {
    if (showRelatedBtn) showRelatedBtn.style.display = "none";
  }

  positionFooterButton();
}

function positionAndShowPopup() {
  if (!lastSelectionRect) {
    hidePopup();
    return;
  }
  const rect = lastSelectionRect;

  // Use the actual rendered height of the popup content, with a fallback.
  const popupHeight =
    translationPopup.offsetHeight > 0 ? translationPopup.offsetHeight : 300;
  const popupWidth = 400; // From CSS

  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

  let top;
  let left = rect.left + scrollLeft;

  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;

  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;

  // If there's not enough space below, and there's more space (or it's the only option) above
  if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
    // Position above the selection
    top = rect.top + scrollTop - popupHeight - 10;
  } else {
    // Position below the selection (default)
    top = rect.bottom + scrollTop + 10;
  }

  // Clamp top position to be within viewport, ensuring it's not pushed off-screen
  if (top < scrollTop) {
    top = scrollTop + 10;
  } else if (top + popupHeight > scrollTop + viewportHeight) {
    top = scrollTop + viewportHeight - popupHeight - 10;
  }

  // --- Horizontal Positioning ---
  if (left + popupWidth > viewportWidth + scrollLeft) {
    left = viewportWidth + scrollLeft - popupWidth - 10;
  }
  if (left < scrollLeft) {
    left = scrollLeft + 10;
  }

  translationPopupHost.style.left = `${left}px`;
  translationPopupHost.style.top = `${top}px`;

  translationPopupHost.style.display = "block";
  requestAnimationFrame(() => {
    translationPopup.classList.add("visible");
    positionFooterButton();
  });
}

function positionFooterButton() {
  const header = shadowRoot.querySelector(".md-modal-header");
  const content = shadowRoot.querySelector(".md-modal-content");
  const footerCenter = shadowRoot.querySelector(".md-footer-center");

  if (header && content && footerCenter) {
    const headerHeight = header.offsetHeight;
    const contentHeight = content.offsetHeight;
    const footerTop = headerHeight + contentHeight - 24;
    footerCenter.style.top = `${footerTop}px`;
    footerCenter.style.opacity = 1;
  } else if (footerCenter) {
    footerCenter.style.opacity = 0;
  }
}

function generatePopupHTML(mainTerm) {
  const { word, abbreviation, description, is_memword, source_url } = mainTerm;
  const closeIconUrl = chrome.runtime.getURL("images/icons8-x.svg");
  return `
    <div id="md-modalOverlay">
        <div class="md-modal">
            <div class="md-modal-header">
                <button class="md-modal-close">
                  <img src="${closeIconUrl}" alt="close" width="20" height="20"/>
                </button>
                <h2 class="md-modal-title">${word}</h2>
                <div class="md-modal-subtitle">${abbreviation}</div>
            </div>
            <div class="md-modal-content">
                <div class="md-modal-description"><p>${description}</p></div>
                <div class="md-modal-tags">${
                  is_memword ? '<span class="md-tag">#MEM用語</span>' : ""
                }</div>
                <div class="md-reference-link-container">
                ${
                  source_url
                    ? '<a href="' +
                      source_url +
                      '" class="md-reference-link" target="_blank">参考リンク</a>'
                    : ""
                }
                </div>
            </div>
            <div id="md-related-terms-container"></div>
            <div class="md-footer-center">
              <button id="md-show-related-btn" class="md-footer-btn">
              <img src="https://img.icons8.com/ios-glyphs/30/chevron-down.png" alt="chevron-down" style="width: 20px; height: 20px;"/>
            </button>

            <div class="md-modal-footer">
              <div class="md-footer-float">
                <div class="tooltip-wrapper" data-tooltip="用語集を開く">
                  <a href="https://google.com" target="_blank" class="md-footer-btn">
                    <img width="24" height="24" src="https://img.icons8.com/windows/32/glossary.png" alt="glossary"/>
                  </a>
                </div>
                
                <div class="tooltip-wrapper" data-tooltip="問い合わせ・<br>用語追加希望を送る">
                  <a href="https://google.com" target="_blank" class="md-footer-btn">
                    <img width="20" height="20" src="https://img.icons8.com/metro/26/paper-plane.png" alt="paper-plane"/>
                  </a>
                </div>
                
                <div class="tooltip-wrapper" data-tooltip="ヘルプ・使い方<br>を見る">
                  <a href="https://google.com" target="_blank" class="md-footer-btn">
                    <img width="24" height="24" src="https://img.icons8.com/fluency-systems-regular/48/help--v1.png" alt="help--v1"/>
                  </a>
                </div>
                </div>
              </div>
            </div>
        </div>
    </div>`;
}

function generateNoResultHTML() {
  const closeIconUrl = chrome.runtime.getURL("images/icons8-x.svg");
  return `
    <div id="md-modalOverlay">
        <div class="md-modal" style="height: 140px;">
          <div class="md-modal-header" style="padding: 0;"></div>
            <div class="md-modal-content" style="padding: 20px 24px 40px;">
                この用語はまだ辞書に登録されていないようです。<br>追加をご希望の際は、以下のフォームよりリクエストいただけます。
            </div>
            <div class="md-footer-center" style="opacity: 1;">
              <div class="md-modal-footer">
                <div class="md-footer-float">
                  <div class="tooltip-wrapper" data-tooltip="用語集を開く">
                    <a href="https://google.com" target="_blank" class="md-footer-btn">
                      <img width="24" height="24" src="https://img.icons8.com/windows/32/glossary.png" alt="glossary"/>
                    </a>
                  </div>
                  
                  <div class="tooltip-wrapper" data-tooltip="問い合わせ・<br>用語追加希望を送る">
                    <a href="https://google.com" target="_blank" class="md-footer-btn">
                      <img width="20" height="20" src="https://img.icons8.com/metro/26/paper-plane.png" alt="paper-plane"/>
                    </a>
                  </div>
                  
                  <div class="tooltip-wrapper" data-tooltip="ヘルプ・使い方<br>を見る">
                    <a href="https://google.com" target="_blank" class="md-footer-btn">
                      <img width="24" height="24" src="https://img.icons8.com/fluency-systems-regular/48/help--v1.png" alt="help--v1"/>
                    </a>
                  </div>
                  </div>
                </div>
               </div>
            </div>
        </div>
    </div>`;
}

function hideIcon() {
  selectionIcon.classList.remove("visible");
  selectionIcon.style.display = "none";
}

function hidePopup() {
  if (translationPopup.classList.contains("visible")) {
    translationPopup.classList.remove("visible");
    lastSelectionRect = null; // Clear the saved rect
    setTimeout(() => {
      translationPopupHost.style.display = "none";
      translationPopup.innerHTML = "";
    }, 500);
  }
}
