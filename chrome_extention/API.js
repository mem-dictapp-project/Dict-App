// async function sendMessageToGAS(message) {
// 	// 最初に文字数チェックを行う
// 	if (message.length < 2 || message.length > 50) {
// 		console.log("選択文字を多く、または少なくしてください（2文字以上50文字以内）");
// 		return "選択文字を多く、または少なくしてください（2文字以上50文字以内）";
// 	}
// 	const url = "https://script.google.com/macros/s/AKfycbytmG6KiAWpMtCqCtmqLf8yNYmoL0rKqLfSPgwuB3JvX8Ifz1yjrzvmRax7j-TZ5j1n/exec"; // デプロイURL

// 	const response = await fetch(url, {
// 		method: "POST",
// 		mode: "cors",
// 		headers: { "Content-Type": "application/json" },
// 		body: JSON.stringify({ message })
// 	});

// 	const result = await response.json();
// 	const value = result.value; // 取得した行情報
// 	console.log("GASからの返却:", value);

// 	return value;
// }

// // 例: message変数の内容を送信
// const message = "membe";
// sendMessageToGAS(message).then(value => {
// 	// value 変数がここで使える
// 	console.log(value);
// 	console.log("A列の値:", value.A);
// 	console.log("D列の値:", value.B);
// 	console.log("D列の値:", typeof value.C);
// 	console.log("D列の値:", value.D);
// 	console.log("D列の値:", value.E);
// });

// 検索Logを取得する（検索したワード、dateStamp、検索結果も出せたら...、あいまい検索欄のものは不要）


async function sendMessageToGAS(message) {
	const url = "https://script.google.com/macros/s/AKfycbytmG6KiAWpMtCqCtmqLf8yNYmoL0rKqLfSPgwuB3JvX8Ifz1yjrzvmRax7j-TZ5j1n/exec"; // デプロイURL

	// 最初に文字数チェックを行う
	if (message.length < 2 || message.length > 50) {
			console.log("選択文字を多く、または少なくしてください（2文字以上50文字以内）");
			// GASにはリクエストを送らず、ここで処理を終える
			return "選択文字を多く、または少なくしてください（2文字以上50文字以内）";
	}

	try {
			const response = await fetch(url, {
					method: "POST",
					mode: "cors",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ message })
			});

			const result = await response.json();
			const value = result.value;
			console.log("GASからの返却:", value);
			return value;
	} catch (error) {
			console.error("エラーが発生しました:", error);
			return null;
	}
}

// 例: message変数の内容を送信
const message = "members"; // スプレッドシートに「m」という値がない場合にnullが返る
sendMessageToGAS(message).then(value => {
	// valueがnullでないか、または文字列でないかを確認
	if (value && typeof value !== 'string') {
			// valueがオブジェクトの場合のみプロパティにアクセスする
			console.log("A列の値:", value.A);
			console.log("D列の値:", value.B);
			console.log("D列の値:", typeof value.C);
			console.log("D列の値:", value.D);
			console.log("D列の値:", value.E);
	} else {
			// valueがnullまたは文字列の場合の処理
			console.log(value); // nullまたはエラーメッセージが表示される
			console.log("値はnull、またはエラーメッセージなので、プロパティにアクセスできません。");
	}
});