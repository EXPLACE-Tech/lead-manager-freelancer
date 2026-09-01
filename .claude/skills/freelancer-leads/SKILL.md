---
name: freelancer-leads
description: Freelancer.comで現在募集中の単価(fixed)案件のみを取得し（時給案件は対象外）、日本語タイトル訳・5分類（Web制作/システム開発/デザイン/マーケティング/その他）・予算の日本円換算を行って、lead-managerの「案件管理 Freelancer」スプレッドシートに追記するSkill。前回取得済みの案件番号に達したら以降は読み込まず打ち切る（トークン節約）。「Freelancerの案件リストして」「lead-manager のFreelancer案件を更新して」等で起動。
argument-hint: (引数不要)
---

# freelancer-leads — Freelancer.com 案件リスト更新Skill

`client-work/lead-manager/` の営業パイプライン管理ツール、Freelancer.com版の**人手起動バッチ**。
GASが自動でAPIを叩く方式・ローカルPCでのヘッドレス無人実行はいずれも見送り、
「利用者がこのSkillを叩いた時だけ動く」方式に確定した（2026-09-01、`docs/進捗.md`参照）。無人実行の権限緩和が不要になる。

## 全体の流れ

1. スプレッドシートから前回までの最大案件番号を調べる
2. 検索クエリごとにFreelancer.comを叩き、**未取得かつ単価(fixed)案件だけ**を選別する（時給案件は対象外。ここでトークンを節約する）
3. 対象分だけ日本語訳・分類・円換算を行う
4. まとめてWeb Appに送信する

---

## 手順

### 1. 前回の最大案件番号を調べる（読み込み範囲の起点）

`gas-freelancer/webapp-config.json`（無ければ`webapp-config.example.json`をコピーして作成するよう案内して中断する）を読み、`sheetFileId`を取得する。

Google Drive（`mcp__claude_ai_Google_Drive__read_file_content`）で、そのfileIdの案件管理スプレッドシートの`案件リスト`シートを読む。

`案件No`列（`FL-xxxxxxxx`形式）の数字部分をすべて取り出し、最大値を `lastMaxId` とする。
1件もなければ `lastMaxId = 0`。

### 2. 為替レートを1回だけ取得する

```
curl -s "https://open.er-api.com/v6/latest/USD"
```

キー不要・1日1回更新の無料API。レスポンスの `rates` から、今回登場しうる通貨（USD/EUR/GBP/INR/CAD/AUD/NZD/SGD等）の対USDレートを控えておく。JPY換算は `金額 ÷ 通貨のUSDレート × USDのJPYレート` で計算する。

### 3. 検索クエリごとにFreelancer.comを叩き、未取得分だけ処理する

検索クエリ（増減はこのSkill自体を編集して調整してよい）:

| label | query |
|---|---|
| Web開発全般 | `web development` |
| WordPress | `wordpress` |
| 業務自動化 | `automation script` |
| API連携 | `api integration` |

各クエリごとに:

```
curl -s "https://www.freelancer.com/api/projects/0.1/projects/active/?query=<URLエンコードしたquery>&limit=20&job_details=true&full_description=false&compact=true" -H "User-Agent: Mozilla/5.0"
```

- レスポンスの `result.projects` を **`id` 降順にソート**する（Freelancer.comの案件IDは投稿順に増加するため、新しい順に並べ直す）
- 先頭から順に見ていき、**`id <= lastMaxId` になった時点でそのクエリの処理を打ち切る**（それ以降は前回までに取得済みのはずの古い案件なので、翻訳・分類などの処理を一切行わない＝トークンを使わない）
- `id > lastMaxId` の案件のうち、**`type` が `fixed`（単価・一括）のものだけ**を「今回の新規候補」としてためる。`type` が `hourly`（時給）の案件はこの時点で除外し、翻訳・分類などの処理を一切行わない（2026-09-01・利用者指示: 単価案件のみをリスト化する方針）

4クエリぶん集めたら、`id` で重複除去する（同じ案件が複数クエリにヒットすることがある）。

### 4. 新規候補だけ、日本語訳・分類・円換算を行う

新規候補が0件ならここで終了してよい（Web Appへの送信もスキップ）。

各案件について:

- **`titleJa`**: `title` を自然な日本語に翻訳する
- **`category`**: タイトルと `seo_url`（例: `/projects/web-design/...` の `web-design` 部分）を手がかりに、**Web制作/システム開発/デザイン/マーケティング/その他** のいずれかに分類する（ライティング・未分類は使わない）。判定基準は2026-09-01に58件を分類した際の実例を踏襲する（`docs/進捗.md` 追記2参照。例: サイト構築・CMS系→Web制作、API連携・自動化・アプリ開発→システム開発、ロゴ・グラフィック・動画→デザイン、SEO・広告・SNS運用→マーケティング、翻訳/データ入力/VA/コンサル等の非開発作業→その他）
- **`budget`**: `budget.minimum`/`budget.maximum` + `currency.code` から `"USD 30〜250"` のような表記を組み立てる（`type`が`hourly`なら末尾に`/h`）
- **`budgetJpy`**: 手順2のレートで換算し、`"約4,500円〜37,500円"` のような表記にする（千円単位で丸めてよい）
- **`deadline`**: `submitdate + bidperiod日` を `yyyy-MM-dd` 形式にする
- **`url`**: `https://www.freelancer.com/projects/` + `seo_url`
- **`caseNo`**: `FL-` + `id`

### 5. Web Appへ送信する

送信先URL・認証トークンは `gas-freelancer/webapp-config.json` を読む（未作成、または`webAppUrl`が未設定なら、Web Appのデプロイを依頼して中断する。導入手順は`docs/納品/導入手順.md`参照）。

```
POST <webAppUrl>
Content-Type: application/json

{
  "secret": "<webapp-config.json の sharedSecret>",
  "leads": [ { "caseNo": "...", "title": "...", "titleJa": "...", "category": "...", "budget": "...", "budgetJpy": "...", "deadline": "...", "url": "..." }, ... ]
}
```

レスポンスの `{"added": n, "skipped": n}` を確認する。

### 6. 結果報告

「Web開発全般: n件中m件が新規／WordPress: ...」のように検索クエリ別の内訳と、最終的にシートに追加された件数を日本語で簡潔に報告する。エラー（Web App未デプロイ・401等）が出た場合はその内容をそのまま伝える。

---

## 注意

- Freelancer.comの検索APIはログイン不要で叩けるが、公式に高頻度アクセスを許可した記載はないグレーゾーン（`client-work/lead-gen/docs/調査_海外案件獲得サイト30.md`追補2参照）。**このSkillは人が呼んだ時だけ動く**ので、連打しない限り問題にならない想定
- `id`降順ソート＆打ち切りはAPIのデフォルト並び順に依存しない設計にしてある（レスポンス側のソート順が変わっても壊れない）
