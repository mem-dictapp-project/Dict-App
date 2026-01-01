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
  "https://script.google.com/macros/s/AKfycbx0Gd0tbZ5tbkk1cwnz5VmXMF3Nl3h4OzSOqL9jDCWE6M6nl5bb21s1OxawOSIX8hyD_Q/exec";

// コンテキストメニューがクリックされたときの処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateText") {
    // 選択されたテキストを取得
    const selectedText = info.selectionText;

    // if (selectedText.length >= 2 && selectedText.length <= 50) { // Removed length check
    if (tab && tab.id != null && tab.id >= 0) {
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: "startTranslation",
          text: selectedText,
        },
        { frameId: info.frameId }
      );
    }
    // }
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
