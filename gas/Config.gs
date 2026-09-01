/**
 * Shared constants and per-platform configuration.
 */

/**
 * Bumped whenever the .gs files change shape.
 * The code is deployed by pasting each file into the Apps Script editor by
 * hand (see docs/セットアップ手順.md), so a half-updated project is the most
 * likely failure mode. Kept here as a quick sanity check when debugging.
 */
const CODE_VERSION = '1.0';

const TZ = 'Asia/Tokyo';

/** The 7-stage pipeline every platform's 案件リスト sheet shares. */
const STATUSES = ['配信検知', '応募済', '返信あり', '商談設定', '商談実施済', '成約', '失注'];

/** Unified category taxonomy every platform's raw category text maps into. */
const CATEGORIES = ['Web制作', 'システム開発', 'デザイン', 'ライティング', 'マーケティング', 'その他', '未分類'];

/**
 * Subset of CATEGORIES that actually gets an 応募文テンプレート sheet.
 * ライティング/その他/未分類 still exist as classification/aggregation buckets
 * (a lead can legitimately land in one of them) but aren't pursued enough to
 * warrant a prepared template yet.
 */
const TEMPLATE_CATEGORIES = ['Web制作', 'システム開発', 'デザイン', 'マーケティング'];

/**
 * カテゴリ/予算/応募期限 は GAS のキーワード判定ではなく、Claude Code のセッション
 * 中に claude-in-chrome で案件詳細ページ（ログイン済みブラウザ）を読んで人力で埋める
 * 運用にした（2026-08-28）。GAS 側はメールの件名・本文から取れる客観情報だけを書き、
 * これらの列は空欄のまま作る。手順は docs/リード処理の手順.md を参照。
 */

/** 各プラットフォームの 案件リスト シート列番号 (1-based)。 */
const LEAD_COL = {
  DELIVERED_AT: 1,
  CASE_NO: 2,
  TITLE: 3,
  CATEGORY: 4,
  BUDGET: 5,
  DEADLINE: 6,
  URL: 7,
  STATUS: 8,
  APPLIED_AT: 9,
  REPLIED_AT: 10,
  MEETING_AT: 11,
  CLOSED_AT: 12,
  NOTE: 13,
};

const LEAD_HEADERS = [
  '配信日時', '案件No', '案件タイトル', 'カテゴリ',
  '予算', '応募期限', 'URL', 'ステータス',
  '応募日', '返信日', '商談日', '成約日/失注日', '備考',
];

/**
 * 応募文テンプレート: TEMPLATE_CATEGORIES ごとに1シート (シート名 = テンプレート接頭辞+カテゴリ名)。
 * 各シートは A2 に応募文まるごと1本、B2 に最終更新日、数行あけた下段に
 * A2 を編集するたびに自動で積み上がる変更履歴 (日付/変更前/変更後)。
 */
const TEMPLATE_HEADERS = ['内容', '最終更新日'];
const TEMPLATE_HISTORY_LABEL_ROW = 4;
const TEMPLATE_HISTORY_HEADER_ROW = 5;
const TEMPLATE_HISTORY_HEADERS = ['日付', '変更前', '変更後'];

/** 集計 シートの列見出し。COUNTIFS で自動算出、考察メモだけ手入力。 */
const AGG_HEADERS = [
  'カテゴリ', '配信検知', '応募済', '返信あり', '商談設定', '商談実施済', '成約', '失注',
  '応募済以降', '返信あり以降', '商談設定以降', '商談実施済以降',
  '返信率', '商談化率', '成約率', '考察メモ',
];

/**
 * One entry per lead-source platform. Only 発注ナビ ships today; to add a new
 * site later, add a config entry here plus a Parser_<Platform>.gs -- the
 * Gmail loop and sheet builders read this list and don't otherwise change.
 * Sites without an inbound notification email (e.g. Upwork) will need a
 * different intake path than Gmail polling, but can still reuse the same
 * 案件リスト/テンプレート/集計 sheet shape.
 *
 * This spreadsheet is dedicated to 発注ナビ (the file itself is named for the
 * platform), so its sheet tabs are unprefixed. If a second platform is ever
 * added to the SAME spreadsheet, prefix that platform's sheet names (or move
 * it to its own spreadsheet) so the tabs don't collide with these.
 */
const PLATFORMS = [
  {
    key: 'hatchinavi',
    label: '発注ナビ',
    senderEmail: 'mo-hnavi@ml.itmedia.co.jp',
    processedLabel: 'LeadManager/発注ナビ処理済',
    listSheet: '案件リスト',
    templateSheetPrefix: 'テンプレート_',
    aggSheet: '集計',
    parse: function (message) {
      return parseHatchuNaviMessage_(message);
    },
  },
];
