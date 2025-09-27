// content.js
// このスクリプトは、Webページ上でユーザーが選択したテキストを検出し、
// 辞書データ(terms.json)と照合して、翻訳や関連情報をポップアップで表示する機能を提供します。

// --- グローバル変数と要素の初期化 ---
// スクリプト全体で使用する変数やDOM要素をここで定義・初期化します。

// ポップアップの本体となるDIV要素を作成し、ページに追加します。
const translationPopup = document.createElement("div");
translationPopup.id = "md-text-translation-popup";
document.body.appendChild(translationPopup);

// テキスト選択時に表示される辞書アイコンのIMG要素を作成し、ページに追加します。
const selectionIcon = document.createElement("img");
selectionIcon.id = "md-selection-icon";
selectionIcon.src = chrome.runtime.getURL("images/dict_icon_48.png");
selectionIcon.style.position = "absolute";
selectionIcon.style.zIndex = "99999";
selectionIcon.style.cursor = "pointer";
selectionIcon.style.width = "32px";
selectionIcon.style.height = "32px";
document.body.appendChild(selectionIcon);

// モーダルの初期状態の最大高さを定義する定数。
const INITIAL_MODAL_MAX_HEIGHT = 200;

// --- ポップアップ内のイベント処理 ---
// ポップアップ内部のクリックイベントを一元的に処理するためのイベントリスナーです。
// イベントデリゲーションのパターンを使用しており、ポップアップ全体で一つのリスナーを共有します。
// これにより、要素が動的に追加・削除された場合でも、イベント処理が正しく機能します。
translationPopup.addEventListener("click", async (event) => {
  // 「関連用語を表示」ボタンがクリックされた場合の処理
  const showRelatedBtn = event.target.closest("#md-show-related-btn");
  if (showRelatedBtn) {
    const relatedTermsContainer = translationPopup.querySelector("#md-related-terms-container");
    const modal = translationPopup.querySelector('.md-modal');

    // 関連用語コンテナが非表示の場合、表示する
    if (relatedTermsContainer.style.display === "none") {
      const relatedTerms = translationPopup._relatedTerms;
      const allResults = translationPopup._allResults;
      if (relatedTerms && relatedTerms.length > 0) {
        relatedTermsContainer.innerHTML = ""; // 既存のリストをクリア
        const list = document.createElement("ul");
        list.className = "md-related-list";

        // 関連用語のリストを動的に生成
        relatedTerms.forEach(term => {
          const listItem = document.createElement("li");
          listItem.textContent = term.word;
          listItem.className = "md-related-item";
          // 各リスト項目にクリックイベントを追加
          listItem.addEventListener("click", (event) => {
            event.stopPropagation(); // 親要素へのイベント伝播を停止
            renderPopup(term, allResults); // ポップアップ内容を更新
          });
          list.appendChild(listItem);
        });

        relatedTermsContainer.appendChild(list);
        relatedTermsContainer.style.display = "block";
        showRelatedBtn.style.transform = "rotate(180deg)"; // アイコンを回転

        // モーダルの高さを関連用語リストの高さ分だけ拡張
        const relatedTermsHeight = list.offsetHeight;
        modal.style.maxHeight = `${INITIAL_MODAL_MAX_HEIGHT + relatedTermsHeight}px`;
      }
    } else {
      // 関連用語コンテナが表示されている場合、非表示にする
      relatedTermsContainer.style.display = "none";
      showRelatedBtn.style.transform = "rotate(0deg)"; // アイコンを元に戻す
      modal.style.maxHeight = `${INITIAL_MODAL_MAX_HEIGHT}px`; // モーダルの高さを初期値に戻す
    }
  }

  // 閉じるボタンがクリックされた場合の処理
  const closeBtn = event.target.closest(".md-modal-close");
  if (closeBtn) {
    hidePopup();
  }
});



// --- グローバルイベントリスナー ---
// ページ全体のイベントを監視し、ポップアップやアイコンの表示・非表示を制御します。

// マウスのボタンが離された時のイベント。テキスト選択の完了を検出します。
document.addEventListener("mouseup", (event) => {
  // クリックがアイコンやポップアップ内であれば、何もしない
  if (event.target === selectionIcon || translationPopup.contains(event.target)) {
    return;
  }
  // setTimeoutを使い、クリックイベントの後に実行されるようにする
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    // 選択されたテキストが適切な長さの場合、アイコンを表示
    if (selectedText.length >= 2 && selectedText.length <= 50) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
      selectionIcon.style.left = `${rect.right + scrollLeft + 5}px`;
      selectionIcon.style.top = `${rect.top + scrollTop}px`;
      selectionIcon.classList.add("visible");
      selectionIcon.dataset.selectedText = selectedText; // 選択テキストをデータとして保持
    } else {
      hideIcon(); // それ以外の場合はアイコンを非表示
    }
  }, 1);
});

// 辞書アイコンがクリックされた時のイベント。翻訳処理を開始します。
selectionIcon.addEventListener("click", () => {
  const text = selectionIcon.dataset.selectedText;
  if (text) {
    startTranslation(text);
    hideIcon();
  }
});

// ブラウザのコンテキストメニューからのメッセージを受け取った時のイベント。
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startTranslation") {
    const selectedText = request.text;
    if (selectedText && selectedText.trim().length > 0) {
      startTranslation(selectedText);
    }
  }
});

// ドキュメント全体がクリックされた時のイベント。ポップアップやアイコンの外側がクリックされたら非表示にします。
document.addEventListener("click", (event) => {
  if (translationPopup.contains(event.target) || selectionIcon.contains(event.target)) {
    return;
  }
  hidePopup();
  hideIcon();
});

// キーボードのキーが押された時のイベント。Escapeキーでポップアップとアイコンを非表示にします。
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hidePopup();
    hideIcon();
  }
});

// --- 関数定義 ---

/**
 * 指定された用語のデータをterms.jsonから非同期で取得します。
 * @param {string} term - 検索する用語。
 * @returns {Promise<Array|null>} - 検索結果の配列。見つからない場合はnull。
 */
async function getTermData(term) {
  console.log(`[getTermData] Fetching data for term: "${term}"`);
  try {
    const url = chrome.runtime.getURL('terms.json');
    console.log(`[getTermData] Fetching from URL: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[getTermData] Failed to fetch terms.json: ${response.status} ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    console.log("[getTermData] Successfully fetched and parsed terms.json:", data);

    // 現在の実装では、terms.jsonからすべてのデータを返し、
    // sendTextForTranslation関数でフィルタリングしています。
    // そのため、ここでのフィルタリング処理はコメントアウトされています。

    if (data.results.length > 0) {
      return data.results;
    }

    console.log(`[getTermData] No match found for term "${term}"`);
    return null;
  } catch (error) {
    console.error('[getTermData] Error fetching or parsing terms data:', error);
    return null;
  }
}

/**
 * 翻訳処理を開始します。まずローディングアニメーションを表示し、
 * その後、sendTextForTranslationを呼び出して実際のデータ取得と表示を行います。
 * @param {string} text - 翻訳するテキスト。
 */
function startTranslation(text) {
  const selection = window.getSelection();

  // ローディングアニメーションを表示
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    translationPopup.style.left = `${rect.left}px`;
    translationPopup.style.top = `${rect.bottom + 10}px`;
  }
  translationPopup.innerHTML = `
    <div class="md-loading-animation">
      <div class="md-dot-pulse"><div class="md-dot-pulse__dot"></div></div>
      <div class="md-loading-text">翻訳中...</div>
    </div>`;
  
  translationPopup.style.display = "block";
  requestAnimationFrame(() => {
    translationPopup.classList.add("visible");
  });

  // データ取得と表示処理へ
  sendTextForTranslation(text, selection);
}

/**
 * 用語データを取得し、ポップアップのHTMLを生成して表示します。
 * @param {string} text - 検索するテキスト。
 * @param {Selection} selection - ユーザーのテキスト選択範囲。
 */
async function sendTextForTranslation(text, selection) {
  console.log("翻訳リクエスト:", text);

  let results = await getTermData(text);

  if (results && results.length > 0) {
    const mainResult = results[0];
    const { word, abbreviation, description, is_memword, source_url } = mainResult;
    // ポップアップの初期HTMLを生成
    translationPopup.innerHTML = generatePopupHTML(word, abbreviation, description, is_memword, source_url);

    // 全結果とメインの結果をポップアップ要素に保存
    translationPopup._allResults = results;
    // ポップアップのコンテンツをレンダリング
    renderPopup(mainResult, results);

    // ポップアップを正しい位置に表示
    positionAndShowPopup(selection);

  } else {
    // 結果が見つからない場合の表示
    translationPopup.innerHTML = `<div class="md-no-result">一致する結果がありません</div>`;
    positionAndShowPopup(selection);
  }
}

/**
 * ポップアップのコンテンツをレンダリング（再描画）します。
 * 関連用語がクリックされた時など、表示内容を動的に更新するために使用されます。
 * @param {object} mainTerm - メインで表示する用語データ。
 * @param {Array} allResults - 検索結果全体の配列。
 */
function renderPopup(mainTerm, allResults) {
  const modal = translationPopup.querySelector('.md-modal');
  // 関連用語クリック時にスクロール位置を一番上に戻す
  if (modal) {
    modal.scrollTop = 0;
  }

  // ポップアップの各要素にデータを設定
  const { word, abbreviation, description, is_memword, source_url } = mainTerm;
  translationPopup.querySelector('.md-modal-title').textContent = word;
  translationPopup.querySelector('.md-modal-subtitle').textContent = abbreviation;
  translationPopup.querySelector('.md-modal-description p').textContent = description;
  const tagsContainer = translationPopup.querySelector('.md-modal-tags');
  if (is_memword) {
    tagsContainer.innerHTML = '<span class="md-tag">#MEM用語</span>';
  } else {
    tagsContainer.innerHTML = '';
  }
  const referenceLink = translationPopup.querySelector('.md-reference-link');
  referenceLink.href = source_url;

  // 関連用語リストを再計算
  const originalMainResult = allResults[0];
  let relatedTerms;
  if (mainTerm === originalMainResult) {
    // メインの用語が表示されている場合、それ以外を関連用語とする
    relatedTerms = allResults.slice(1);
  } else {
    // 関連用語が表示されている場合、元のメイン用語をリストの先頭に追加する
    relatedTerms = [originalMainResult, ...allResults.filter(t => t !== mainTerm && t !== originalMainResult)];
  }
  translationPopup._relatedTerms = relatedTerms;

  // 関連用語リストが既に表示されている場合は、リストを再構築する
  const relatedTermsContainer = translationPopup.querySelector("#md-related-terms-container");
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

  // モーダルの高さを調整
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

  // 関連用語の有無に応じて「関連用語を表示」ボタンの表示を切り替え
  if (relatedTerms.length > 0) {
    const showRelatedBtn = translationPopup.querySelector("#md-show-related-btn");
    if(showRelatedBtn) {
      showRelatedBtn.style.display = "block";
    }
  } else {
    const showRelatedBtn = translationPopup.querySelector("#md-show-related-btn");
    if(showRelatedBtn) {
      showRelatedBtn.style.display = "none";
    }
  }

  // フッターボタンの位置を調整
  positionFooterButton();
}

/**
 * ポップアップを選択されたテキストの近くに配置し、表示します。
 * @param {Selection} selection - ユーザーのテキスト選択範囲。
 */
function positionAndShowPopup(selection) {
  if (!selection || selection.rangeCount === 0) {
    hidePopup();
    return;
  }

  const popupRect = translationPopup.getBoundingClientRect();
  const popupWidth = popupRect.width;
  const popupHeight = popupRect.height;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
  
  let top = rect.bottom + scrollTop + 10;
  let left = rect.left + scrollLeft;

  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;

  // ポップアップが画面外にはみ出さないように位置を調整
  if (left + popupWidth > viewportWidth + scrollLeft) {
    left = viewportWidth + scrollLeft - popupWidth - 10;
  }
  if (left < scrollLeft) {
    left = scrollLeft + 10;
  }
  if (rect.bottom + popupHeight + 10 > viewportHeight) {
    if (rect.top > popupHeight + 10) {
      top = rect.top + scrollTop - popupHeight - 10;
    }
  }
  
  translationPopup.style.left = `${left}px`;
  translationPopup.style.top = `${top}px`;

  // ポップアップを表示（アニメーション付き）
  translationPopup.style.display = "block";
  requestAnimationFrame(() => {
    translationPopup.classList.add("visible");
    positionFooterButton();
  });
}

/**
 * 「関連用語を表示」ボタンの位置を動的に調整します。
 * ヘッダーとコンテンツの高さに基づいて位置を決定します。
 */
function positionFooterButton() {
  const header = translationPopup.querySelector('.md-modal-header');
  const content = translationPopup.querySelector('.md-modal-content');
  const footerCenter = translationPopup.querySelector('.md-footer-center');

  if (header && content && footerCenter) {
    const headerHeight = header.offsetHeight;
    const contentHeight = content.offsetHeight;
    const footerTop = headerHeight + contentHeight - 32;
    footerCenter.style.top = `${footerTop}px`;
    footerCenter.style.opacity = 1;
  } else if (footerCenter) {
    footerCenter.style.opacity = 0;
  }
}

/**
 * ポップアップのHTML文字列を生成します。
 * @param {string} word - 単語
 * @param {string} abbreviation - 略語
 * @param {string} description - 説明
 * @param {boolean} is_memword - MEM用語かどうか
 * @param {string} source_url - 参考リンクのURL
 * @returns {string} - 生成されたHTML文字列
 */
function generatePopupHTML(word, abbreviation, description, is_memword, source_url) {
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
                <a href="${source_url}" class="md-reference-link" target="_blank">参考リンク</a>
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
            <a class="md-footer-btn" title="翻訳"><img width="24" height="24" src="https://img.icons8.com/windows/32/glossary.png" alt="glossary"/></a>
            <a class="md-footer-btn" title="共有"><img width="20" height="20" src="https://img.icons8.com/metro/26/paper-plane.png" alt="paper-plane"/></a>
            <a class="md-footer-btn" title="ヘルプ"><img width="24" height="24" src="https://img.icons8.com/fluency-systems-regular/48/help--v1.png" alt="help--v1"/></a>
          </div>
        </div>
    </div>`;
}

/**
 * 辞書アイコンを非表示にします。
 */
function hideIcon() {
  selectionIcon.classList.remove("visible");
}

/**
 * ポップアップを非表示にします。
 */
function hidePopup() {
  if (translationPopup.classList.contains("visible")) {
    translationPopup.classList.remove("visible");
    setTimeout(() => {
      translationPopup.style.display = "none";
      translationPopup.innerHTML = "";
    }, 500);
  }
}