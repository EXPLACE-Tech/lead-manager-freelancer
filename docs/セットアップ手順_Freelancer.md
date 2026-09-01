# lead-manager セットアップ手順（Freelancer.com版・版2）

対象: Freelancer.com の営業パイプライン管理（Google スプレッドシート + Google Apps Script + `/freelancer-leads` Skill）
案件取得・日本語訳・カテゴリ判定・日本円換算は**社長が`/freelancer-leads` Skillを叩いた時だけ**Claude Codeが行う。GASは書き込み専用のWeb Appとしてシートに反映するだけ（`docs/進捗.md` 参照）。

2026-09-01、旧スプレッドシート「案件管理 Freelancer」（版1・58件データあり）は使わず、**新規スプレッドシートで版2を作り直す**ことにした。

---

## 1. スプレッドシートを新規作成する

1. [sheets.new](https://sheets.new) を開く
2. ファイル名を「案件管理 Freelancer」など分かりやすい名前に変更
3. メニューの **拡張機能 → Apps Script** を開く

---

## 2. コードファイルを貼り付ける

1. デフォルトの`Code.gs`の中身を全部削除し、`gas-freelancer/Config.gs`の内容を貼り付けてファイル名を`Config`に変更
2. `+`→`スクリプト`で以下4ファイルを追加（ファイル名は拡張子なし）
   - `Setup` ← `gas-freelancer/Setup.gs`
   - `SheetWriter` ← `gas-freelancer/SheetWriter.gs`
   - `WebApi` ← `gas-freelancer/WebApi.gs`
   - `TemplateHistory` ← `gas-freelancer/TemplateHistory.gs`
3. 歯車アイコン「プロジェクトの設定」→「'appsscript.json' マニフェスト ファイルをエディタで表示する」にチェック
4. `appsscript.json`を`gas-freelancer/appsscript.json`の内容で置き換える
5. 保存（Ctrl+S）

（すべて `C:\Users\user\dev\projects\client-work\lead-manager\` 配下のフルパス）

**認証トークンの手動生成は不要。** 次の手順3で`setup()`を実行すると自動生成される（詳細は`docs/納品/トークン発行手順.md`）。

---

## 3. 初期セットアップを実行する

1. 関数選択プルダウンで`setup`を選び実行（▷）
2. 初回は承認画面が出る。「権限を確認」→アカウント選択→「詳細」→「（プロジェクト名）に移動」→「許可」
3. 実行ログに「セットアップが完了しました」と出ればOK
4. スプレッドシートに戻りリロード。以下のシートができているか確認する:
   - `案件リスト`（15列、J列がステータスのプルダウン）
   - `テンプレート_Web制作` `テンプレート_システム開発` `テンプレート_デザイン` `テンプレート_マーケティング`
   - `集計`
5. **完了メッセージに表示された認証トークンを控えておく**（手順4のWeb Appデプロイ後、`webapp-config.json`に使う。詳細は`docs/納品/トークン発行手順.md`）

---

## 4. WebApi を Web App としてデプロイする

1. Apps Scriptエディタ右上の「デプロイ」→「新しいデプロイ」
2. 種類の選択（歯車アイコン）で「ウェブアプリ」を選ぶ
3. 「次のユーザーとして実行」= 自分、「アクセスできるユーザー」= 全員
4. 「デプロイ」→ 承認画面が出たら許可する
5. 発行された**ウェブアプリのURL**（`https://script.google.com/macros/s/xxxxx/exec`）を控える

URLが取れたら`gas-freelancer/webapp-config.json`（無ければ`webapp-config.example.json`をコピーして作成）の`webAppUrl`に反映する。`sharedSecret`は手順2で設定した`SHARED_SECRET`と同じ値にする。このファイルは`.gitignore`対象なので各自のローカルにのみ置く。

---

## 5. 動作確認（手動テスト送信・任意）

控えたURLに以下をPOSTする（ブラウザの開発者ツール・PowerShellの`Invoke-RestMethod`等）。

```json
{
  "secret": "手順3のsetup()完了メッセージに表示されたトークン",
  "leads": [
    { "caseNo": "FL-TEST0001", "title": "Test Project", "titleJa": "テスト案件", "category": "Web制作",
      "budget": "USD 30〜250", "budgetJpy": "約4,500円〜37,500円", "deadline": "2026-09-15", "url": "https://example.com/test" }
  ]
}
```

`{"added":1,"skipped":0}`が返り、`案件リスト`に1行増えていれば成功。確認後はテスト行を削除してよい。省略して次の6.で`/freelancer-leads`を実行し、そこで一括確認してもよい。

---

## 6. 運用

以降は利用者が「Freelancerの案件リストして」等で`/freelancer-leads` Skillを呼ぶだけ。取得〜翻訳〜分類〜円換算〜書き込みまで一括で行われる。詳細は`.claude/skills/freelancer-leads/SKILL.md`参照。

---

## トラブルシューティング

| 症状 | 確認ポイント |
|---|---|
| `setup`実行時に「ReferenceError」 | ファイルの貼り付け漏れ・ファイル名間違い（手順2を再確認） |
| Web AppへのPOSTが401を返す | `webapp-config.json`の`sharedSecret`が、`setup()`実行時に表示されたトークンと一致しているか確認（`docs/納品/トークン発行手順.md`参照） |
| デプロイ後もURLが古いまま反映されない | コード変更後は「デプロイを管理」→既存デプロイの鉛筆アイコン→バージョン「新バージョン」を選んで更新する（新しいデプロイを都度作るとURLが変わる） |

## コードを更新したとき

`gas-freelancer/`側のファイルを直したら、Apps Scriptエディタ側の同名ファイルに手動で貼り直す。`Config.gs`の`CODE_VERSION`を上げておく。
