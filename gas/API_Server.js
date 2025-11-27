function doPost(e){
  // スプレッドシートIDを定数として保持
  const SPREADSHEET_ID = "1k9iJRvgmMUe1MW7ijDgFEm5IGH5_5unPJ7bMWLPg9y8";
  // 履歴を記録するシート名
  const HISTORY_SHEET_NAME = "検索履歴"; 

  let searchValue = "";   // 検索値（message）を保持する変数
  let resultValue = null; // 検索結果を保持する変数
  const timestamp = new Date(); // 現在時刻を取得

  // ★ 修正点 1: historySheetをtryブロックの外側で宣言する
  let historySheet = null; 

  try{
    const data = JSON.parse(e.postData.contents);
    const message = data.message;
    searchValue = message; // 検索値をセット

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("運用者用");
    
    // ★ 修正点 2: historySheetに値を代入する
    historySheet = ss.getSheetByName(HISTORY_SHEET_NAME); // 履歴シートを取得

    const terms = sheet.getRange(2,6,sheet.getLastRow() -1,1).getValues();

    // 文字数チェックを最初に行う
    if (message.length < 2 || message.length > 50) {
      resultValue = "選択文字を多く、または少なくしてください（2文字以上50文字以内）";
    } else {
      for(let i = 0; i < terms.length; i++){
        if(terms[i][0] === message) {
          const row = i + 2;
          const colA = sheet.getRange(row, 1).getValue();
          const colB = sheet.getRange(row, 2).getValue();
          const colC = sheet.getRange(row, 3).getValue();
          const colD = sheet.getRange(row, 4).getValue();
          const colE = sheet.getRange(row, 5).getValue();

          resultValue = { A: colA , B: colB , C: colC , D: colD , E: colE };
          break; 
        }
      }
      
      // 検索結果が見つからなかった場合
      if (resultValue === null) {
          resultValue = "指定された検索値に一致するデータが見つかりませんでした。";
      }
    }

    // 履歴シートにデータを追記（成功/未発見のログ）
    const resultToLog = (typeof resultValue === 'object' && resultValue !== null) 
                         ? JSON.stringify(resultValue) 
                         : resultValue;
    
    if (historySheet) {
      historySheet.appendRow([searchValue, resultToLog, timestamp]);
    } else {
      // 履歴シートが見つからない場合、ログを出力（これはサーバーサイドのログ）
      Logger.log("エラー: '検索履歴' シートが見つかりません。");
    }

    return ContentService
      .createTextOutput(JSON.stringify({value: resultValue}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    // エラー発生時も履歴に記録（tryブロック外で宣言された historySheet を使用）
    if (historySheet) { 
        historySheet.appendRow([searchValue, `GAS実行時エラー: ${err.message}`, timestamp]);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}