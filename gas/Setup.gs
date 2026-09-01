/**
 * One-time spreadsheet construction, trigger installation, and the sheet
 * menu. Run setup() once after pasting these files into a fresh Google
 * Sheet's Apps Script editor (see docs/セットアップ手順.md), then
 * installTrigger(). Safe to re-run: existing sheets/rows are left alone,
 * setup() only fills in whatever is still missing.
 */

const CHECK_TRIGGER_HANDLER = 'checkNewLeads';

/**
 * setup()/installTrigger() are one-time/rarely-used, so they're left off the
 * menu once initial setup is done -- run them from the Apps Script editor's
 * function dropdown if they're ever needed again (e.g. after a schema change).
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('営業パイプライン')
    .addItem('新着案件を今すぐチェック', 'checkNewLeads')
    .addToUi();
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  PLATFORMS.forEach(function (platform) {
    buildLeadListSheet_(ss, platform);
    buildTemplateSheets_(ss, platform);
    buildAggSheet_(ss, platform);
  });
  removeBlankDefaultSheet_(ss);
  report_(
    'セットアップが完了しました（版' + CODE_VERSION + '）。\n\n作成/確認したシート:\n' +
      PLATFORMS.map(function (p) {
        const templateNames = TEMPLATE_CATEGORIES.map(function (c) { return p.templateSheetPrefix + c; }).join(' / ');
        return '・' + p.listSheet + ' / ' + templateNames + ' / ' + p.aggSheet;
      }).join('\n') +
      '\n\n次は「② 15分トリガーを設定」を実行してください。'
  );
}

function buildLeadListSheet_(ss, platform) {
  const sheet = getOrCreateSheet_(ss, platform.listSheet);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, LEAD_HEADERS.length).setValues([LEAD_HEADERS]);
    sheet.setFrozenRows(1);
  }
  const statusRange = sheet.getRange(2, LEAD_COL.STATUS, 998, 1);
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  statusRange.setDataValidation(rule);
}

function buildTemplateSheets_(ss, platform) {
  TEMPLATE_CATEGORIES.forEach(function (category) {
    const sheet = getOrCreateSheet_(ss, platform.templateSheetPrefix + category);
    if (sheet.getLastRow() > 0) return; // already built -- leave content as the user last touched it

    sheet.getRange(1, 1, 1, TEMPLATE_HEADERS.length).setValues([TEMPLATE_HEADERS]);
    sheet.setFrozenRows(1);

    sheet.getRange(TEMPLATE_HISTORY_LABEL_ROW, 1).setValue('変更履歴');
    sheet.getRange(TEMPLATE_HISTORY_HEADER_ROW, 1, 1, TEMPLATE_HISTORY_HEADERS.length).setValues([TEMPLATE_HISTORY_HEADERS]);
  });
}

function buildAggSheet_(ss, platform) {
  const sheet = getOrCreateSheet_(ss, platform.aggSheet);
  if (sheet.getLastRow() > 0) return; // already built -- leave formulas as the user last touched them

  sheet.getRange(1, 1, 1, AGG_HEADERS.length).setValues([AGG_HEADERS]);
  sheet.setFrozenRows(1);

  const listRef = "'" + platform.listSheet + "'";
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

    // I 応募済以降=C:H, J 返信あり以降=D:H, K 商談設定以降=E:H, L 商談実施済以降=F:H
    sheet.getRange(r, 9).setFormula('=SUM(C' + r + ':H' + r + ')');
    sheet.getRange(r, 10).setFormula('=SUM(D' + r + ':H' + r + ')');
    sheet.getRange(r, 11).setFormula('=SUM(E' + r + ':H' + r + ')');
    sheet.getRange(r, 12).setFormula('=SUM(F' + r + ':H' + r + ')');

    // M 返信率=J/I, N 商談化率=K/J, O 成約率=G/L (成約件数 / 商談実施済以降)
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

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === CHECK_TRIGGER_HANDLER) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger(CHECK_TRIGGER_HANDLER).timeBased().everyMinutes(15).create();
  report_('15分ごとの自動チェック（' + CHECK_TRIGGER_HANDLER + '）を設定しました。');
}

/**
 * setup()/installTrigger() are meant to be run from the Apps Script editor,
 * where getUi() throws, so every dialog goes through here and degrades to
 * the execution log when there's no spreadsheet UI to talk to.
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
