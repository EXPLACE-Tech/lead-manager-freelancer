/**
 * One-time spreadsheet construction. Run setup() once after pasting these
 * files into a fresh Google Sheet's Apps Script editor (see
 * docs/納品/導入手順.md), then deploy WebApi.gs as a Web App.
 * Safe to re-run: existing sheets/rows are left alone, setup() only fills in
 * whatever is still missing.
 *
 * 版2（2026-09-01）: 案件取得はローカルPCのClaude Codeが担当するため、GAS側の
 * 時間主導型トリガー・スプレッドシートメニューは廃止した（installTrigger()
 * ・onOpen() を削除）。
 */

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  buildLeadListSheet_(ss);
  buildTemplateSheets_(ss);
  buildAggSheet_(ss);
  removeBlankDefaultSheet_(ss);
  report_(
    'セットアップが完了しました（版' + CODE_VERSION + '）。\n\n作成/確認したシート:\n' +
      '・' + LIST_SHEET + ' / ' +
      TEMPLATE_CATEGORIES.map(function (c) { return TEMPLATE_SHEET_PREFIX + c; }).join(' / ') +
      ' / ' + AGG_SHEET +
      '\n\n■認証トークン（webapp-config.jsonのsharedSecretにこの値をそのままコピーする）:\n' +
      getSharedSecret_() +
      '\n\n次は WebApi.gs を Web App としてデプロイしてください（手順書参照）。'
  );
}

function buildLeadListSheet_(ss) {
  const sheet = getOrCreateSheet_(ss, LIST_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, LEAD_HEADERS.length).setValues([LEAD_HEADERS]);
    sheet.setFrozenRows(1);
  }
  const statusRange = sheet.getRange(2, LEAD_COL.STATUS, 998, 1);
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  statusRange.setDataValidation(rule);
}

function buildTemplateSheets_(ss) {
  TEMPLATE_CATEGORIES.forEach(function (category) {
    const sheet = getOrCreateSheet_(ss, TEMPLATE_SHEET_PREFIX + category);
    if (sheet.getLastRow() > 0) return; // already built -- leave content as the user last touched it

    sheet.getRange(1, 1, 1, TEMPLATE_HEADERS.length).setValues([TEMPLATE_HEADERS]);
    sheet.setFrozenRows(1);

    sheet.getRange(TEMPLATE_HISTORY_LABEL_ROW, 1).setValue('変更履歴');
    sheet.getRange(TEMPLATE_HISTORY_HEADER_ROW, 1, 1, TEMPLATE_HISTORY_HEADERS.length).setValues([TEMPLATE_HISTORY_HEADERS]);
  });
}

/**
 * force=true で既存の集計シートを作り直す（列構成が変わった直後の移行用）。
 * 通常の setup() 呼び出し（force省略）では既存の集計は触らない。
 */
function buildAggSheet_(ss, force) {
  const sheet = getOrCreateSheet_(ss, AGG_SHEET);
  if (sheet.getLastRow() > 0 && !force) return; // already built -- leave formulas as the user last touched them
  if (force) sheet.clear();

  sheet.getRange(1, 1, 1, AGG_HEADERS.length).setValues([AGG_HEADERS]);
  sheet.setFrozenRows(1);

  const listRef = "'" + LIST_SHEET + "'";
  const catCol = colLetter_(LEAD_COL.CATEGORY);
  const statusCol = colLetter_(LEAD_COL.STATUS);
  const catRange = listRef + '!$' + catCol + '$2:$' + catCol + '$1000';
  const statusRange = listRef + '!$' + statusCol + '$2:$' + statusCol + '$1000';

  const rows = CATEGORIES.concat(['合計']);
  rows.forEach(function (category, i) {
    const r = i + 2;
    sheet.getRange(r, 1).setValue(category);
    const catCriteria = category === '合計' ? '"*"' : '"' + category + '"';

    STATUSES.forEach(function (status, si) {
      const c = 2 + si; // B..H = 配信検知..失注
      sheet.getRange(r, c).setFormula('=COUNTIFS(' + catRange + ',' + catCriteria + ',' + statusRange + ',"' + status + '")');
    });

    sheet.getRange(r, 9).setFormula('=SUM(C' + r + ':H' + r + ')');
    sheet.getRange(r, 10).setFormula('=SUM(D' + r + ':H' + r + ')');
    sheet.getRange(r, 11).setFormula('=SUM(E' + r + ':H' + r + ')');
    sheet.getRange(r, 12).setFormula('=SUM(F' + r + ':H' + r + ')');

    sheet.getRange(r, 13).setFormula('=IFERROR(J' + r + '/I' + r + ',"")');
    sheet.getRange(r, 14).setFormula('=IFERROR(K' + r + '/J' + r + ',"")');
    sheet.getRange(r, 15).setFormula('=IFERROR(G' + r + '/L' + r + ',"")');
  });
  sheet.getRange(2, 13, rows.length, 3).setNumberFormat('0.0%');
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

/** A=1 -> "A", works up to column 26, which covers every sheet this project builds. */
function colLetter_(col) {
  return String.fromCharCode(64 + col);
}

/**
 * Deletes the blank "Sheet1"/"シート1" Google Sheets creates by default, but
 * only if it's still empty -- never touches a sheet with real data in it.
 */
function removeBlankDefaultSheet_(ss) {
  ['Sheet1', 'シート1'].forEach(function (name) {
    const sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() === 0 && sheet.getLastColumn() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(sheet);
    }
  });
}

/**
 * setup() is meant to be run from the Apps Script editor, where getUi()
 * throws, so every dialog goes through here and degrades to the execution
 * log when there's no spreadsheet UI to talk to.
 */
function ui_() {
  try {
    return SpreadsheetApp.getUi();
  } catch (e) {
    return null;
  }
}

function report_(text) {
  console.log(text);
  const ui = ui_();
  if (ui) ui.alert(text);
}
