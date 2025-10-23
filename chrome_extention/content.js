// content.js

// --- グローバル変数と要素の初期化 ---
const translationPopupHost = document.createElement("div");
translationPopupHost.id = "md-text-translation-popup-host";
translationPopupHost.style.position = "absolute";
document.body.appendChild(translationPopupHost);

const shadowRoot = translationPopupHost.attachShadow({ mode: 'open' });

// スタイルシートを動的に読み込み、Shadow DOMに適用
const styleUrl = chrome.runtime.getURL('styles.css');
fetch(styleUrl)
  .then(response => response.text())
  .then(css => {
    const style = document.createElement('style');
    style.textContent = css;
    shadowRoot.appendChild(style);
  });

const translationPopup = document.createElement("div");
translationPopup.id = "md-text-translation-popup";
shadowRoot.appendChild(translationPopup);

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

const INITIAL_MODAL_MAX_HEIGHT = 200;

// --- ポップアップ内のイベント処理 ---
translationPopup.addEventListener("click", async (event) => {
  const showRelatedBtn = event.target.closest("#md-show-related-btn");
  if (showRelatedBtn) {
    const relatedTermsContainer = shadowRoot.querySelector("#md-related-terms-container");
    const modal = shadowRoot.querySelector('.md-modal');
    const computedStyle = window.getComputedStyle(relatedTermsContainer);

    if (computedStyle.display === "none") {
      const relatedTerms = translationPopup._relatedTerms;
      const allResults = translationPopup._allResults;

      if (relatedTerms && relatedTerms.length > 0) {
        relatedTermsContainer.innerHTML = ""; // Clear previous terms
        const list = document.createElement("ul");
        list.className = "md-related-list";

        relatedTerms.forEach(term => {
          const listItem = document.createElement("li");
          listItem.textContent = term.word;
          listItem.className = "md-related-item";
          listItem.addEventListener("click", (event) => {
            event.stopPropagation();
            renderPopup(term, allResults)
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

// --- グローバルイベントリスナー ---
document.addEventListener("mouseup", (event) => {
  if (event.target === selectionIcon || translationPopupHost.contains(event.target)) {
    return;
  }
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText.length >= 2 && selectedText.length <= 50) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
      selectionIcon.style.left = `${rect.right + scrollLeft + 5}px`;
      selectionIcon.style.top = `${rect.top + scrollTop}px`;
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
  if (translationPopupHost.contains(event.target) || selectionIcon.contains(event.target)) {
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

async function getTermData(term) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 100; // ms

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const url = chrome.runtime.getURL('terms.json');
      const response = await fetch(url);

      // 4xx, 5xx系のエラーはリトライしても成功しないので即時失敗させる
      if (!response.ok) {
        console.error(`[getTermData] Failed to fetch terms.json with status: ${response.status}. Aborting retries.`);
        return null;
      }

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return data.results;
      }
      // JSONは正しいが中身が空の場合
      return null;

    } catch (error) {
      console.error(`[getTermData] Attempt ${i + 1} of ${MAX_RETRIES} failed:`, error);
      if (i < MAX_RETRIES - 1) {
        // 次のリトライの前に少し待機
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
      } else {
        // すべてのリトライが失敗
        console.error('[getTermData] All retry attempts failed.');
        return null;
      }
    }
  }
  return null;
}

function startTranslation(text) {
  const selection = window.getSelection();

  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    translationPopupHost.style.left = `${rect.left}px`;
    translationPopupHost.style.top = `${rect.bottom + 10}px`;
  }
  translationPopup.innerHTML = `
    <div class="md-loading-animation">
      <div class="md-dot-pulse"><div class="md-dot-pulse__dot"></div></div>
      <div class="md-loading-text">翻訳中...</div>
    </div>`;
  
  translationPopupHost.style.display = "block";
  requestAnimationFrame(() => {
    translationPopup.classList.add("visible");
  });

  sendTextForTranslation(text, selection);
}

async function sendTextForTranslation(text, selection) {
  let results = await getTermData(text);

  if (results && results.length > 0) {
    const mainResult = results[0];
    translationPopup.innerHTML = generatePopupHTML(mainResult);
    translationPopup._allResults = results;
    renderPopup(mainResult, results);
    positionAndShowPopup(selection);
  } else {
    translationPopup.innerHTML = `<div class="md-no-result">一致する結果がありません</div>`;
    positionAndShowPopup(selection);
  }
}

function renderPopup(mainTerm, allResults) {
  const modal = shadowRoot.querySelector('.md-modal');
  if (modal) {
    modal.scrollTop = 0;
  }

  const { word, abbreviation, description, is_memword, source_url } = mainTerm;
  shadowRoot.querySelector('.md-modal-title').textContent = word;
  shadowRoot.querySelector('.md-modal-subtitle').textContent = abbreviation;
  shadowRoot.querySelector('.md-modal-description p').textContent = description;
  const tagsContainer = shadowRoot.querySelector('.md-modal-tags');
  if (is_memword) {
    tagsContainer.innerHTML = '<span class="md-tag">#MEM用語</span>';
  } else {
    tagsContainer.innerHTML = '';
  }
  const referenceLinkContainer = shadowRoot.querySelector('.md-reference-link-container');
  if (referenceLinkContainer) {
    if (source_url) {
      referenceLinkContainer.innerHTML = `<a href="${source_url}" class="md-reference-link" target="_blank">参考リンク</a>`;
    } else {
      referenceLinkContainer.innerHTML = '';
    }
  }

  const originalMainResult = allResults[0];
  let relatedTerms;
  if (mainTerm === originalMainResult) {
    relatedTerms = allResults.slice(1);
  } else {
    relatedTerms = [originalMainResult, ...allResults.filter(t => t !== mainTerm && t !== originalMainResult)];
  }
  translationPopup._relatedTerms = relatedTerms;

  const relatedTermsContainer = shadowRoot.querySelector("#md-related-terms-container");
  if (relatedTermsContainer.style.display !== "none") {
    relatedTermsContainer.innerHTML = "";
    const list = document.createElement("ul");
    list.className = "md-related-list";

    relatedTerms.forEach(term => {
      const listItem = document.createElement("li");
      listItem.textContent = term.word;
      listItem.className = "md-related-item";
      listItem.addEventListener("click", (event) => {
        event.stopPropagation();
        renderPopup(term, allResults)
      });
      list.appendChild(listItem);
    });
    relatedTermsContainer.appendChild(list);
  }

  if (modal) {
    if (relatedTermsContainer.style.display === "none") {
      modal.style.maxHeight = `${INITIAL_MODAL_MAX_HEIGHT}px`;
    } else {
      const list = relatedTermsContainer.querySelector('ul');
      if (list) {
        const relatedTermsHeight = list.offsetHeight;
        modal.style.maxHeight = `${INITIAL_MODAL_MAX_HEIGHT + relatedTermsHeight}px`;
      }
    }
  }

  const showRelatedBtn = shadowRoot.querySelector("#md-show-related-btn");
  if (relatedTerms.length > 0) {
    if(showRelatedBtn) showRelatedBtn.style.display = "block";
  } else {
    if(showRelatedBtn) showRelatedBtn.style.display = "none";
  }

  positionFooterButton();
}

function positionAndShowPopup(selection) {
  if (!selection || selection.rangeCount === 0) {
    hidePopup();
    return;
  }

  const popupRect = translationPopupHost.getBoundingClientRect();
  const popupWidth = 400; // Approximate width

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
  
  let top = rect.bottom + scrollTop + 10;
  let left = rect.left + scrollLeft;

  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;

  if (left + popupWidth > viewportWidth + scrollLeft) {
    left = viewportWidth + scrollLeft - popupWidth - 10;
  }
  if (left < scrollLeft) {
    left = scrollLeft + 10;
  }
  if (rect.bottom + 300 > viewportHeight) { // Approximate height
    if (rect.top > 300) {
      top = rect.top + scrollTop - 300 - 10;
    }
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
  const header = shadowRoot.querySelector('.md-modal-header');
  const content = shadowRoot.querySelector('.md-modal-content');
  const footerCenter = shadowRoot.querySelector('.md-footer-center');

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
            </div>
        </div>
        <div class="md-modal-footer">
          <div class="md-footer-float">
            <div class="tooltip-wrapper">
              <a href="https://google.com" target="_blank" class="md-footer-btn">
                <img width="24" height="24" src="https://img.icons8.com/windows/32/glossary.png" alt="glossary"/>
              </a>
              <div class="tooltip">
                <div class="tooltip-text">用語集を開く</div>
              </div>
            </div>
            
            <div class="tooltip-wrapper">
              <a href="https://google.com" target="_blank" class="md-footer-btn">
                <img width="20" height="20" src="https://img.icons8.com/metro/26/paper-plane.png" alt="paper-plane"/>
              </a>
              <div class="tooltip">
                <div class="tooltip-text">問い合わせ・<br>用語追加希望を送る</div>
              </div>
            </div>
            
            <div class="tooltip-wrapper">
              <a href="https://google.com" target="_blank" class="md-footer-btn">
                <img width="24" height="24" src="https://img.icons8.com/fluency-systems-regular/48/help--v1.png" alt="help--v1"/>
              </a>
              <div class="tooltip">
                <div class="tooltip-text">ヘルプ・使い方<br>を見る</div>
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
    setTimeout(() => {
      translationPopupHost.style.display = "none";
      translationPopup.innerHTML = "";
    }, 500);
  }
}
