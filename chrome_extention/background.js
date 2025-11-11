// background.js

// 拡張機能がインストールされた時の処理
chrome.runtime.onInstalled.addListener(() => {
  console.log("辞書拡張機能がインストールされました");

  // 右クリックメニューのアイテムを追加
  chrome.contextMenus.create({
    id: "translateText",
    title: "選択テキストをMEM辞書に問い合わせ",
    contexts: ["selection"], // テキスト選択時のみメニューを表示
  });
});

const API_URL =
  "https://script.google.com/macros/s/AKfycbzby1FIPScxolpnAnRa4ngF3yPFLsgVs7QmlhnGH-rhs5phVZ3RHi346MX5RXfXZ3aUNQ/exec";

// コンテキストメニューがクリックされたときの処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateText") {
    // 選択されたテキストを取得
    const selectedText = info.selectionText;

    if (selectedText.length >= 2 && selectedText.length <= 50) {
      // tab.id が有効な場合にのみメッセージを送信
      if (tab && tab.id != null && tab.id >= 0) {
        // コンテンツスクリプトに選択テキストを送信して翻訳を開始
        chrome.tabs.sendMessage(tab.id, {
          action: "startTranslation",
          text: selectedText,
        });
      }
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchFromGAS") {
    fetch(API_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: request.message }),
    })
      .then((response) => response.json())
      .then((data) => {
        sendResponse({ success: true, data: data });
      })
      .catch((error) => {
        console.error("Error fetching from GAS:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // 非同期レスポンスのためにtrueを返す
  }
});
