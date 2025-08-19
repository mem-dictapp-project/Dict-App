function doPost(e){
	try{
		const data = JSON.parse(e.postData.contents);
    const message = data.message;

    const ss = SpreadsheetApp.openById("1k9iJRvgmMUe1MW7ijDgFEm5IGH5_5unPJ7bMWLPg9y8");
    const sheet = ss.getSheetByName("運用者用");

    const terms = sheet.getRange(2,6,sheet.getLastRow() -1,1).getValues();

    let value = null;
    for(let i = 0; i < terms.length; i++){
      if(terms[i][0] === message) {
        // 一致した行番号
        const row = i + 2;
        // A列(1列目) と D列(4列目) を取得
        const colA = sheet.getRange(row, 1).getValue();
        const colB = sheet.getRange(row, 2).getValue();
        const colC = sheet.getRange(row, 3).getValue();
        const colD = sheet.getRange(row, 4).getValue();
        const colE = sheet.getRange(row, 5).getValue();

        // 必要な形で格納（配列やオブジェクトなど）
        value = { A: colA , B: colB , C: colC , D: colD , E: colE };
        break;
      }
    }
    return ContentService
      .createTextOutput(JSON.stringify({value}))
      .setMimeType(ContentService.MimeType.JSON);
	} catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}