/**
 * SIŁKA 3 — Google Apps Script
 * 
 * Wklej ten kod w edytorze Apps Script utworzonym Z POZIOMU otwartego arkusza
 * (Rozszerzenia → Apps Script).
 *
 * Obsługiwane akcje:
 *   POST { action: 'append', rows: [...] } → dopisuje nowe wiersze
 *   GET  ?action=read                     → zwraca pełną historię z arkusza
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    if (data.action === 'append' && Array.isArray(data.rows)) {
      data.rows.forEach(function(r) {
        sheet.appendRow([
          r.num || '',
          r.date || '',
          r.dow || '',
          r.duration || '',
          r.break_days || '',
          r.avg_3m || '',
          r.avg_br || ''
        ]);
      });
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, appended: data.rows.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    
    if (action === 'read') {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      var values = sheet.getDataRange().getValues();
      var rows = [];
      // Pomijamy pierwszy wiersz (nagłówki).
      // Kolumny: num, date, dow, duration, break_days, avg_3m, avg_br
      for (var i = 1; i < values.length; i++) {
        var v = values[i];
        if (!v[1]) continue; // pusta data → pomiń
        
        // Data może przyjść jako Date obiekt z Sheets — konwersja na YYYY-MM-DD
        var dateStr = v[1];
        if (dateStr instanceof Date) {
          var y = dateStr.getFullYear();
          var m = ('0' + (dateStr.getMonth() + 1)).slice(-2);
          var d = ('0' + dateStr.getDate()).slice(-2);
          dateStr = y + '-' + m + '-' + d;
        } else {
          dateStr = String(dateStr).trim();
        }
        
        // Czas trwania — może być Date z godzinami albo string
        var durStr = v[3];
        if (durStr instanceof Date) {
          var h = ('0' + durStr.getHours()).slice(-2);
          var mi = ('0' + durStr.getMinutes()).slice(-2);
          durStr = h + ':' + mi;
        } else {
          durStr = String(durStr).trim();
        }
        
        rows.push({
          date: dateStr,
          duration: durStr
        });
      }
      
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, rows: rows }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput('SIŁKA 3 endpoint działa. Użyj POST do append lub GET ?action=read.')
      .setMimeType(ContentService.MimeType.TEXT);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
