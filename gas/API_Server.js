function doPost(e){
  try{
    const data = JSON.parse(e.postData.contents);
    const message = data.message;

    const ss = SpreadsheetApp.openById("1k9iJRvgmMUe1MW7ijDgFEm5IGH5_5unPJ7bMWLPg9y8");
    const sheet = ss.getSheetByName("運用者用");

    const terms = sheet.getRange(2,6,sheet.getLastRow() -1,1).getValues();

    let value = null;

    // 文字数チェックを最初に行う
    if (message.length < 2 || message.length > 50) {
      value = "選択文字を多く、または少なくしてください（2文字以上50文字以内）";
    } else {
      for(let i = 0; i < terms.length; i++){
        if(terms[i][0] === message) {
          const row = i + 2;
          const colA = sheet.getRange(row, 1).getValue();
          const colB = sheet.getRange(row, 2).getValue();
          const colC = sheet.getRange(row, 3).getValue();
          const colD = sheet.getRange(row, 4).getValue();
          const colE = sheet.getRange(row, 5).getValue();

          value = { A: colA , B: colB , C: colC , D: colD , E: colE };
          break; 
        }
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