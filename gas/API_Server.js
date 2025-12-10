function doPost(e) {
  // スプレッドシートIDを定数として保持
  const SPREADSHEET_ID = "1k9iJRvgmMUe1MW7ijDgFEm5IGH5_5unPJ7bMWLPg9y8";
  // 履歴を記録するシート名
  const HISTORY_SHEET_NAME = "検索履歴"; 

  let searchTerm = "";   // 検索値（message）を保持する変数
  let matchType = null; // 検索結果を保持する変数
  const timestamp = new Date(); // 現在時刻を取得

  // ★ 修正点 1: historySheetをtryブロックの外側で宣言する
  let historySheet = null; 

  try {
    const data = JSON.parse(e.postData.contents);
    // 検索語句を小文字化・トリム
    const message = data.message.toString().trim().toLowerCase();
    searchTerm = message;
    
    // 検索語句をログに出力
    Logger.log("検索語句: %s", searchTerm); 

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("運用者用");

    // ★ 修正点 2: historySheetに値を代入する
    historySheet = ss.getSheetByName(HISTORY_SHEET_NAME); // 履歴シートを取得

    const lastRow = sheet.getLastRow();
    
    let value = [];
    // 読み込んだ行数を記録するカウンター
    let processedRowCount = 0;

    if (lastRow >= 2) {
      const numRows = lastRow - 1;
      // データ範囲を一括取得
      const rangeData = sheet.getRange(2, 1, numRows, 7).getValues();

      for (let i = 0; i < rangeData.length; i++) {
        // ★ 読み込んだ行数をカウント
        processedRowCount++; 
        
        const rawF = rangeData[i][5];
        const rawG = rangeData[i][6];

        // F列とG列が両方空の行を見つけたら、即座に検索を終了
        if (!rawF && !rawG) {
          Logger.log("データ末尾に到達しました (F列, G列ともに空)。処理を終了します。");
          break; 
        }

        // ここから先はデータがある行だけ実行されるので無駄がない
        const termA = rawF.toString().trim(); 
        const termB = rawG.toString().trim(); 

        let matchType = null;

        // 優先度1: 完全一致検索 (Exact Match)
        if (termA === searchTerm || termB === searchTerm) {
          matchType = "exact";
        } 
        // 優先度2: あいまい検索 (Partial Match)
        else if (termA.includes(searchTerm) || termB.includes(searchTerm)) {
          matchType = "partial";
        }

        if (matchType) {
          value.push({
            A: rangeData[i][0],
            B: rangeData[i][1],
            C: rangeData[i][2],
            D: rangeData[i][3],
            E: rangeData[i][4],
            matchType: matchType,
            termA: termA,
            termB: termB  
          });
        }
      }
    }
    
    // ★ 最終的な読み込み行数（ループ実行回数）をログに出力
    Logger.log("読み込み完了。検索対象として処理した行数: %s 行 (2行目から数えて %s 行目まで)", processedRowCount, processedRowCount + 1);
    
    // 検索結果の件数をログに出力
    Logger.log("検索結果件数 (ソート前): %s 件", value.length);

    // ソート処理
    value.sort((a, b) => {
      // 優先度1: 完全検索 (exact) が先
      if (a.matchType === "exact" && b.matchType === "partial") return -1;
      if (a.matchType === "partial" && b.matchType === "exact") return 1;
      
      // 優先度2: G列 (termB) の字数が短い順 (昇順)
      const lenB_a = a.termB.length;
      const lenB_b = b.termB.length;
      if (lenB_a !== lenB_b) return lenB_a - lenB_b;

      // 優先度3: F列 (termA) の字数が短い順 (昇順)
      const lenA_a = a.termA.length;
      const lenA_b = b.termA.length;
      if (lenA_a !== lenA_b) return lenA_a - lenA_b;

      return 0;
    });

     // 履歴シートにデータを追記（成功/未発見のログ）
    const resultToLog = (typeof value === 'object' && value !== null) 
                         ? JSON.stringify(value) 
                         : value;
    
    if (historySheet) {
      historySheet.appendRow([searchTerm, resultToLog, timestamp]);
    } else {
      // 履歴シートが見つからない場合、ログを出力（これはサーバーサイドのログ）
      Logger.log("エラー: '検索履歴' シートが見つかりません。");
    }
    
    // ソート後の最終結果をログに出力（オブジェクト全体）
    Logger.log("ソート後の最終結果: %s", JSON.stringify(value));

    return ContentService
      .createTextOutput(JSON.stringify({ value }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // エラー発生時もログに出力
    Logger.log("GAS実行時エラー: %s", err.message);
    
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}