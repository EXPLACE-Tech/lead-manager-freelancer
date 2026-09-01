/**
 * Parses a 発注ナビ new-listing notification email into a lead record.
 *
 * Sample body (labels use full-width colons "："):
 *   新規案件が配信されました。
 *   URL： https://developer.hnavi.co.jp/jobs/18159
 *   案件No.：202608280013
 *   案件タイトル：コーポレートサイトのリニューアル制作
 *   カテゴリ：開発・制作（ホームページ）
 *
 * 予算/応募期限/カテゴリ は GAS 側では確定させない (Claude Code + claude-in-chrome
 * によるブラウザ読み取りで後から埋める運用。docs/リード処理の手順.md 参照)。
 * 予算/応募期限 はメール本文にあれば best-effort で拾うが、無くても構わない。
 */
function parseHatchuNaviMessage_(message) {
  const body = message.getPlainBody();

  const caseNo = extractField_(body, ['案件No\\.', '案件No']);
  const title = extractField_(body, ['案件タイトル']);
  const url = extractField_(body, ['URL']);
  const budget = extractField_(body, ['予算', '想定予算']);
  const deadline = extractField_(body, ['応募期限', '募集期限']);

  if (!caseNo || !title) return null;

  return {
    deliveredAt: message.getDate(),
    caseNo: caseNo,
    title: title,
    category: '',
    budget: budget,
    deadline: deadline,
    url: url,
  };
}

/**
 * Reads "ラベル：値" (half or full-width colon) from a plain-text body.
 * labelAlternatives is tried in order (put the more specific pattern, e.g.
 * one with a trailing literal ".", before the shorter one it's a prefix of).
 */
function extractField_(body, labelAlternatives) {
  const re = new RegExp('(?:' + labelAlternatives.join('|') + ')\\s*[：:]\\s*(.+)');
  const match = body.match(re);
  return match ? match[1].trim() : '';
}
