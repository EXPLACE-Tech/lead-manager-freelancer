/**
 * Shared constants for the Freelancer.com 案件リスト spreadsheet.
 *
 * 版2（2026-09-01）: GAS 側は Freelancer.com API を直接叩かなくなった。
 * 案件取得・日本語タイトル翻訳・カテゴリ判定・日本円換算は、人が
 * `/freelancer-leads` Skillを呼んだときにClaude Codeが行い、結果を
 * doPost（WebApi.gs）経由でこのシートに書き込む。GAS はスプレッドシートの器
 * （シート構築・書き込み受け口）だけを担当する。
 */

const CODE_VERSION = '2.0';
const TZ = 'Asia/Tokyo';

/** 発注ナビと共通の 7段階パイプライン。 */
const STATUSES = ['配信検知', '応募済', '返信あり', '商談設定', '商談実施済', '成約', '失注'];

/** 発注ナビと共通の統一カテゴリ体系（Freelancer.com運用では実質5分類のみ使用）。 */
const CATEGORIES = ['Web制作', 'システム開発', 'デザイン', 'ライティング', 'マーケティング', 'その他', '未分類'];
const TEMPLATE_CATEGORIES = ['Web制作', 'システム開発', 'デザイン', 'マーケティング'];

const LEAD_COL = {
  DELIVERED_AT: 1,
  CASE_NO: 2,
  TITLE: 3,
  TITLE_JA: 4,
  CATEGORY: 5,
  BUDGET: 6,
  BUDGET_JPY: 7,
  DEADLINE: 8,
  URL: 9,
  STATUS: 10,
  APPLIED_AT: 11,
  REPLIED_AT: 12,
  MEETING_AT: 13,
  CLOSED_AT: 14,
  NOTE: 15,
};

const LEAD_HEADERS = [
  '配信日時', '案件No', '案件タイトル', '案件タイトル(日本語訳)', 'カテゴリ',
  '予算', '予算(日本円換算)', '応募期限', 'URL', 'ステータス',
  '応募日', '返信日', '商談日', '成約日/失注日', '備考',
];

const TEMPLATE_HEADERS = ['内容', '最終更新日'];
const TEMPLATE_HISTORY_LABEL_ROW = 4;
const TEMPLATE_HISTORY_HEADER_ROW = 5;
const TEMPLATE_HISTORY_HEADERS = ['日付', '変更前', '変更後'];

const AGG_HEADERS = [
  'カテゴリ', '配信検知', '応募済', '返信あり', '商談設定', '商談実施済', '成約', '失注',
  '応募済以降', '返信あり以降', '商談設定以降', '商談実施済以降',
  '返信率', '商談化率', '成約率', '考察メモ',
];

const LIST_SHEET = '案件リスト';
const TEMPLATE_SHEET_PREFIX = 'テンプレート_';
const AGG_SHEET = '集計';

/**
 * doPost（WebApi.gs）を呼べるのはこのトークンを知っている相手だけ、という
 * 簡易認証。手動生成は不要 -- setup() の初回実行時に自動生成され、
 * PropertiesService（このApps Scriptプロジェクト内だけに保存され、
 * コードやgitには一切残らない）に保存される。生成された値は setup() の
 * 完了メッセージに表示されるので、それを webapp-config.json にコピーする。
 */
function getSharedSecret_() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('SHARED_SECRET');
  if (!secret) {
    secret = Utilities.getUuid().replace(/-/g, '');
    props.setProperty('SHARED_SECRET', secret);
  }
  return secret;
}
