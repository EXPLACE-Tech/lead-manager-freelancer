# freelancer-leads の git共有手順

対象: 社内作業用メモ（EXPLACEへの説明にはそのまま使わない）
最終更新: 2026-09-01

---

## 現状

`lead-manager` は現時点で**gitリポジトリ化されていない**（2026-09-01確認、`.git`なし）。
姉妹プロジェクトの `slack-attendance` も同様に、このPC上では未初期化。

`client-work/README.md` に既定のEXPLACE案件向けgit規約が定義済み:

- コミット署名: `EXPLACE-Tech <tech@explace.co.jp>`（リポジトリのローカル設定）
- リモート: `git@github-explace:...`（`~/.ssh/config` の別名ホスト。`github.com`と書くと個人鍵で認証に行って失敗する）

---

## 共有までの手順（案）

1. `lead-manager/` 直下で `git init`
2. ローカルのgit署名をこのリポジトリだけEXPLACE用に設定
   ```
   git config user.name "EXPLACE-Tech"
   git config user.email "tech@explace.co.jp"
   ```
3. `.gitignore` を用意する（`webapp-config.json` の`sharedSecret`、`Config.gs`の`SHARED_SECRET`など、
   秘匿情報を含むファイルの扱いを先に決める。**このリポジトリをそのままEXPLACEと共有する場合、
   Web Appの認証トークンが漏れる**ため、共有前に対処が必要）
4. 初回コミット
5. GitHub（EXPLACE組織）に空リポジトリを作成し、`git@github-explace:<org>/lead-manager.git` のような形でリモート追加
6. push
7. EXPLACE側に招待 or リポジトリURLを共有

---

## 決定事項（2026-09-01）

- **リモートリポジトリ**: 未作成。EXPLACE側で用意してもらう想定（`git@github-explace:...`）
- **SHARED_SECRETの扱い**: 実際のトークンはリポジトリに含めない方針に変更した。
  - `gas-freelancer/Config.gs` の `SHARED_SECRET` はプレースホルダに差し替え済み
  - `gas-freelancer/webapp-config.json`（実際のURL・トークンが入る）は `.gitignore` 対象にした
  - 代わりに `gas-freelancer/webapp-config.example.json`（値はすべて説明文のプレースホルダ）をコミットし、
    導入時にコピーして使う形にした
  - トークンの発行手順は `docs/納品/トークン発行手順.md` としてEXPLACE向けに別出ししてある
- **リポジトリの範囲**: 発注ナビ側（`gas/`）も同じ`lead-manager`リポジトリに含める（分けない）

## 実施した作業

1. `lead-manager/`直下で`git init`
2. ローカルgit設定をこのリポジトリだけEXPLACE用に設定（`user.name`=`EXPLACE-Tech`、`user.email`=`tech@explace.co.jp`）
3. `.gitignore`で`gas-freelancer/webapp-config.json`を除外
4. 初回コミット

## 残っている作業（EXPLACE側 or 今後）

- GitHub側に空リポジトリを作成し、リモート追加・push（リモートURLが分かり次第）
- EXPLACEへの招待 or リポジトリURL共有
