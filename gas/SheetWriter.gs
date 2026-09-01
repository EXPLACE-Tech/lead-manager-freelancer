/**
 * Appends one lead to a platform's 案件リスト sheet, skipping silently if the
 * 案件No is already present -- a defense-in-depth duplicate guard behind the
 * Gmail label, in case the same message is ever processed twice.
 * Returns true if a row was written.
 */
function appendLead_(sheet, lead) {
  if (leadExists_(sheet, lead.caseNo)) return false;

  const row = new Array(LEAD_HEADERS.length).fill('');
  row[LEAD_COL.DELIVERED_AT - 1] = lead.deliveredAt;
  row[LEAD_COL.CASE_NO - 1] = lead.caseNo;
  row[LEAD_COL.TITLE - 1] = lead.title;
  row[LEAD_COL.CATEGORY - 1] = lead.category;
  row[LEAD_COL.BUDGET - 1] = lead.budget;
  row[LEAD_COL.DEADLINE - 1] = lead.deadline;
  row[LEAD_COL.URL - 1] = lead.url;
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
