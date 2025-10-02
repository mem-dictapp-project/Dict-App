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

// コンテキストメニューがクリックされたときの処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateText") {
    // 選択されたテキストを取得
    const selectedText = info.selectionText;

    if (selectedText.length >= 2 && selectedText.length <= 50) {
      // コンテンツスクリプトに選択テキストを送信して翻訳を開始
      chrome.tabs.sendMessage(tab.id, {
        action: "startTranslation",
        text: selectedText,
      });
    }
  }
});
