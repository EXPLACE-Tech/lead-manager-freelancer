/**
 * Appends one lead to 案件リスト, skipping silently if 案件No が既にある
 * （Claude Code 側は毎回APIから取り直すため、同じ案件を複数回送ってくる
 * ことがある。防御用の重複ガード）。Returns true if a row was written.
 */
function appendLead_(sheet, lead) {
  if (leadExists_(sheet, lead.caseNo)) return false;

  const row = new Array(LEAD_HEADERS.length).fill('');
  row[LEAD_COL.DELIVERED_AT - 1] = lead.deliveredAt || new Date();
  row[LEAD_COL.CASE_NO - 1] = lead.caseNo;
  row[LEAD_COL.TITLE - 1] = lead.title;
  row[LEAD_COL.TITLE_JA - 1] = lead.titleJa || '';
  row[LEAD_COL.CATEGORY - 1] = lead.category || '';
  row[LEAD_COL.BUDGET - 1] = lead.budget || '';
  row[LEAD_COL.BUDGET_JPY - 1] = lead.budgetJpy || '';
  row[LEAD_COL.DEADLINE - 1] = lead.deadline || '';
  row[LEAD_COL.URL - 1] = lead.url || '';
  row[LEAD_COL.STATUS - 1] = STATUSES[0]; // 配信検知

  sheet.appendRow(row);
  return true;
}

function leadExists_(sheet, caseNo) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const caseNos = sheet.getRange(2, LEAD_COL.CASE_NO, lastRow - 1, 1).getValues();
  return caseNos.some(function (r) { return String(r[0]) === String(caseNo); });
}
