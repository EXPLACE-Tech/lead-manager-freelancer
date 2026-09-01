/**
 * 書き込み専用のWeb App受け口。ローカルPC上でヘッドレス実行される Claude
 * Code から、1時間ごとに取得・翻訳・分類・円換算済みの案件データがPOST
 * される。デプロイ方法は docs/セットアップ手順_Freelancer.md 参照。
 *
 * リクエストボディ（JSON）:
 *   {
 *     "secret": "Config.gs の SHARED_SECRET と同じ値",
 *     "leads": [
 *       {
 *         "caseNo": "FL-12345678",
 *         "title": "英語の原題",
 *         "titleJa": "日本語訳タイトル",
 *         "category": "Web制作" 等5分類のいずれか,
 *         "budget": "USD 30〜250" のような原通貨の表記,
 *         "budgetJpy": "約4,500円〜37,500円" のような日本円換算表記,
 *         "deadline": "2026-09-08",
 *         "url": "https://www.freelancer.com/projects/..."
 *       }, ...
 *     ]
 *   }
 *
 * レスポンス（JSON）: { "added": n, "skipped": n }
 */
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse_({ error: 'invalid JSON body' }, 400);
  }

  if (body.secret !== SHARED_SECRET) {
    return jsonResponse_({ error: 'unauthorized' }, 401);
  }
  if (!Array.isArray(body.leads)) {
    return jsonResponse_({ error: 'leads must be an array' }, 400);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LIST_SHEET);
  if (!sheet) {
    return jsonResponse_({ error: 'シート「' + LIST_SHEET + '」が見つかりません。setup() を先に実行してください。' }, 500);
  }

  let added = 0;
  let skipped = 0;
  body.leads.forEach(function (lead) {
    if (!lead || !lead.caseNo || !lead.title) {
      skipped++;
      return;
    }
    if (appendLead_(sheet, lead)) {
      added++;
    } else {
      skipped++;
    }
  });

  return jsonResponse_({ added: added, skipped: skipped });
}

/** doPost 経由でしか使わないが、ブラウザで直接URLを開いたときに死なないよう用意。 */
function doGet(e) {
  return jsonResponse_({ status: 'ok', message: 'POST only. See WebApi.gs for the request shape.' });
}

function jsonResponse_(obj, statusCode) {
  // ContentService は HTTP ステータスコードを設定できないため、エラー内容は
  // レスポンスボディの "error" キーで判別する（呼び出し側はステータスでなく
  // ボディを見ること）。
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
