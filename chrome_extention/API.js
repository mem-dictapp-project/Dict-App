async function sendMessageToGAS(message) {
	const url = "https://script.google.com/macros/s/AKfycbytmG6KiAWpMtCqCtmqLf8yNYmoL0rKqLfSPgwuB3JvX8Ifz1yjrzvmRax7j-TZ5j1n/exec"; // デプロイURL

	const response = await fetch(url, {
		method: "POST",
		mode: "cors",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ message })
	});

	const result = await response.json();
	const value = result.value; // 取得した行情報
	console.log("GASからの返却:", value);

	return value;
}

// 例: message変数の内容を送信
const message = "members";
sendMessageToGAS(message).then(value => {
	// value 変数がここで使える
	console.log(value);
	console.log("A列の値:", value.A);
	console.log("D列の値:", value.B);
	console.log("D列の値:", typeof value.C);
	console.log("D列の値:", value.D);
	console.log("D列の値:", value.E);
});