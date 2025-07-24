// ポップアップが読み込まれた時の処理
document.addEventListener("DOMContentLoaded", function () {
  const clickBtn = document.getElementById("clickBtn");
  const randomBtn = document.getElementById("randomBtn");
  const timeBtn = document.getElementById("timeBtn");
  const counter = document.getElementById("counter");
  const message = document.getElementById("message");

  let clickCount = 0;

  // クリックカウンターのボタン
  clickBtn.addEventListener("click", function () {
    clickCount++;
    counter.textContent = `クリック回数: ${clickCount}`;

    // クリック数に応じてメッセージを変更
    if (clickCount === 1) {
      message.textContent = "初回クリックです！";
      message.style.color = "#4CAF50";
    } else if (clickCount === 5) {
      message.textContent = "5回クリックしました！";
      message.style.color = "#FF9800";
    } else if (clickCount === 10) {
      message.textContent = "10回達成！すごいですね！";
      message.style.color = "#F44336";
    } else if (clickCount > 10) {
      message.textContent = "もうそろそろ疲れませんか？😅";
      message.style.color = "#9C27B0";
    }
  });

  // ランダムな色を生成するボタン
  randomBtn.addEventListener("click", function () {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    document.body.style.backgroundColor = randomColor;
    message.textContent = `背景色を ${randomColor} に変更しました！`;
    message.style.color = "#333";
  });

  // 現在時刻を表示するボタン
  timeBtn.addEventListener("click", function () {
    const now = new Date();
    const timeString = now.toLocaleTimeString("ja-JP");
    const dateString = now.toLocaleDateString("ja-JP");
    message.textContent = `${dateString} ${timeString}`;
    message.style.color = "#333";

    // 時刻によって挨拶を変える
    const hour = now.getHours();
    let greeting = "";
    if (hour < 12) {
      greeting = "おはようございます！";
    } else if (hour < 18) {
      greeting = "こんにちは！";
    } else {
      greeting = "こんばんは！";
    }

    setTimeout(() => {
      message.textContent = greeting;
      message.style.color = "#4CAF50";
    }, 2000);
  });

  // 初期メッセージ
  message.textContent = "ボタンを押してみてください！";
});
