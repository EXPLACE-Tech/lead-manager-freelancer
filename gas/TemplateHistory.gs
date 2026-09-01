/**
 * Simple onEdit trigger: whenever the 内容 cell (A2) of a per-category
 * テンプレート_<カテゴリ> sheet changes, appends a dated row to that same
 * sheet's change-log block further down, instead of relying on someone to
 * remember to log it by hand. Runs as a simple trigger (no extra
 * authorization step) since it only touches the spreadsheet it's bound to.
 *
 * Only fires for single-cell edits -- a bulk paste has no per-cell
 * e.oldValue to log, so those are skipped silently.
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const platform = PLATFORMS.filter(function (p) { return sheet.getName().indexOf(p.templateSheetPrefix) === 0; })[0];
  if (!platform) return;

  const category = sheet.getName().slice(platform.templateSheetPrefix.length);
  if (TEMPLATE_CATEGORIES.indexOf(category) === -1) return;

  if (e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1) return;
  if (e.range.getColumn() !== 1 || e.range.getRow() !== 2) return; // A2 = 内容

  const before = e.oldValue || '';
  const after = e.value || '';
  if (before === after) return;

  sheet.getRange(2, 2).setValue(new Date()); // B2 = 最終更新日

  const historyRow = findFirstEmptyHistoryRow_(sheet);
  sheet.getRange(historyRow, 1, 1, TEMPLATE_HISTORY_HEADERS.length).setValues([[new Date(), before, after]]);
}

function findFirstEmptyHistoryRow_(sheet) {
  let row = TEMPLATE_HISTORY_HEADER_ROW + 1;
  while (sheet.getRange(row, 1).getValue() !== '') row++;
  return row;
}
