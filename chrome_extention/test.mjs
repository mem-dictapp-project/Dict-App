import fetch from "node-fetch";

// GASのWebアプリURL
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx0Gd0tbZ5tbkk1cwnz5VmXMF3Nl3h4OzSOqL9jDCWE6M6nl5bb21s1OxawOSIX8hyD_Q/exec";

async function sendMessageToGAS(message) {
    // 最初に文字数チェックを行う
    if (message.length < 2 || message.length > 50) {
        console.log("選択文字を多く、または少なくしてください（2文字以上50文字以内）");
        // GASにはリクエストを送らず、ここで処理を終える
        return "選択文字を多く、または少なくしてください（2文字以上50文字以内）";
    }

    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });

        // レスポンスをJSONとしてパースする
        const result = await response.json(); 
        
        // 成功した場合は、result.value (ヒットしたデータの配列) を返す
        if (result.value) {
            return result.value;
        } 
        // GAS側でエラーが発生した場合、result.error を返す
        else if (result.error) {
            console.error("GAS処理エラー:", result.error);
            return null; // または result.error
        }
        
        // 予期せぬレスポンス形式の場合
        return null; 

    } catch (error) {
        console.error("通信またはJSONパースエラーが発生しました:", error.message);
        return null;
    }
}

// 例: message変数の内容を送信
const message = "da"; 

sendMessageToGAS(message).then(hitList => {
    // hitList は、GASから返された配列 (例: [ {A: '...', ...}, {A: '...', ...} ] )

    // 1. nullまたは文字列（エラーメッセージや文字数超過の警告）が返ってきた場合
    if (hitList === null || typeof hitList === 'string') {
        console.log(hitList);
        console.log("値はnull、またはエラーメッセージなので、プロパティにアクセスできません。");
        return;
    }
    
    // 2. 配列（データ）が返ってきた場合の処理
    
    if (hitList.length === 0) {
        console.log(`「${message}」に一致するデータは見つかりませんでした。`);
        return;
    }

    console.log(`--- 「${message}」の検索結果 ---`);
    console.log(`合計 ${hitList.length} 件のデータがヒットしました。`);
    
    // ヒットしたデータの配列をループして、一つずつ取り出す
    for (const item of hitList) {
        // item は { A: '...', B: '...', C: '...', D: '...', E: '...' } というオブジェクト
        console.log("-------------------------------");
        console.log(`A列の値: ${item.A}`);
        console.log(`B列の値: ${item.B}`);
        console.log(`C列の値: ${item.C}`);
        console.log(`D列の値: ${item.D}`);
        console.log(`E列の値: ${item.E}`);
    }
    console.log("-------------------------------");

});