/**
 * Main entry point, fired every 15 minutes by the time trigger installed via
 * installTrigger() in Setup.gs. Loops over PLATFORMS so a future site only
 * needs a new Config.gs entry and a parser file -- this function doesn't
 * otherwise change.
 */
function checkNewLeads() {
  PLATFORMS.forEach(function (platform) {
    try {
      checkPlatform_(platform);
    } catch (e) {
      console.error('[' + platform.label + '] チェックに失敗: ' + e.message);
    }
  });
}

function checkPlatform_(platform) {
  const label = getOrCreateLabel_(platform.processedLabel);
  const query = 'from:(' + platform.senderEmail + ') -label:"' + platform.processedLabel + '"';
  const threads = GmailApp.search(query, 0, 50);
  if (threads.length === 0) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(platform.listSheet);
  if (!sheet) {
    console.error('[' + platform.label + '] シート「' + platform.listSheet + '」が見つかりません。setup() を先に実行してください。');
    return;
  }

  let added = 0;
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (message) {
      const lead = platform.parse(message);
      if (!lead) {
        console.warn('[' + platform.label + '] 本文の解析に失敗したメールをスキップしました: ' + message.getSubject());
        return;
      }
      if (appendLead_(sheet, lead)) added++;
    });
    // Thread-level label: fine as long as one notification email = one thread,
    // which holds for 発注ナビ (distinct subject per case -> distinct thread).
    thread.addLabel(label);
  });

  if (added > 0) console.log('[' + platform.label + '] ' + added + '件の新規案件を追加しました。');
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}
