---
name: data-update
description: サクッと印紙税 で扱う共通データソース(products/_shared/data/sources/<key>/) の追加・更新・鮮度チェックを行う。Desktop Scheduled Task からのアラート時、新しいデータソースを追加したい時、既存ソースを更新したい時に使用。外部原典(国税庁・協会けんぽ・年金機構等) のデータを扱うすべての作業はこのスキルに従う。
---

# サクッと印紙税 データ更新スキル

## 重要: 共通データソース機構について

このプロジェクト群の外部原典データは **すべて** `products/_shared/data/sources/<key>/` に集約されている(共通データソース機構)。
ツール側の `src/data/sources/` はビルド時にこの正本からコピーされる **キャッシュ** であり、編集対象ではない。

更新は **必ず `_shared` 側を編集** すること。各ツールへは次回ビルドで自動反映される。

```
products/
├── _shared/data/sources/<key>/    ← ★ ここが正本(編集対象)
│   ├── source.json                  メタデータ(URL, lastChecked, consumers)
│   ├── _raw/原典.txt                 全文ダンプ(差分検知用)
│   └── data.ts(または .md)          AI/コードが読む正本
└── <project>/
    ├── data-sources.json            このツールが使う key の宣言
    └── src/data/sources/<key>/      ビルド時にコピーされる(.gitignore、編集禁止)
```

## テンプレート派生直後の初期セットアップ

`_template/` から新しいツールを派生させた直後、共通データソース機構を有効にするために以下を1回だけ行う。

1. **`data-sources.json` 作成**(プロジェクトルート):
   ```json
   {
     "$comment": "このプロジェクトが _shared/data/sources から取り込む共通データソースのkey一覧。",
     "sources": []
   }
   ```
   使用するソースが決まっていなければ空配列でOK。後から追加可能。

2. **`package.json` の scripts に sync フックを追加**:
   ```json
   "scripts": {
     "predev": "node ../_template/scripts/sync-shared-sources.mjs",
     "dev": "vite",
     "prebuild": "node ../_template/scripts/sync-shared-sources.mjs",
     "build": "tsc -b && vite build"
   }
   ```

3. **`.gitignore` に追加**:
   ```
   # 共通データソース(_shared/data/sources/) からビルド時にコピーされる正本キャッシュ
   src/data/sources/
   ```

4. **ダッシュボードに登録**(`ツール管理ダッシュボード/data/tools/<tool-id>.json` を新規作成):
   ```json
   {
     "id": "<tool-id>",
     "name": "ツール表示名",
     "dirName": "<プロジェクトディレクトリ名>",
     "url": "https://...",
     "feedbackSource": { "type": "none" },
     "dataSources": []
   }
   ```

これで `npm run dev` / `npm run build` 時に自動的に共通データソースが同期される状態になる。
共通データソースを追加するときは下記「新規共通データソースを追加するとき」セクションへ。

---

## 新規共通データソースを追加するとき

新しい外部原典データをツールに取り込みたいとき、必ず以下の6ステップを順に実行する。**ツール内の `src/data/` に直接ファイルを作ってはいけない**。

### Step 1: `_shared/data/sources/<key>/` を作成
key は kebab-case の識別子(例: `nta-business-center`, `nta-expense-knowledge`)。配下に以下を作る:

- `source.json` — メタデータ。最低限以下のフィールド:
  ```json
  {
    "key": "<key>",
    "label": "人間が読むラベル",
    "sourceUrl": "https://...",
    "sourceUrls": ["..."],
    "sourceLastModified": "YYYY-MM-DD",
    "lastChecked": "YYYY-MM-DD",
    "checkWindow": "yearly|quarterly|monthly",
    "description": "...",
    "files": ["data.ts"],
    "consumers": ["ツール名"]
  }
  ```
- `_raw/.gitkeep` — 全文ダンプ用ディレクトリ
- `data.ts`(または `*.md`)— 正本。型は **インライン定義** するか、同期先からの相対パスで import する(同期先は `<project>/src/data/sources/<key>/data.ts` なので、相対 import は `../../../<types-path>` になる)

### Step 2: ツールの `data-sources.json` に key を追加
```json
{
  "sources": ["...", "新しい-key"]
}
```

### Step 3: ツールの `package.json` に sync フックがあるか確認
無ければ追加:
```json
"scripts": {
  "predev": "node ../_template/scripts/sync-shared-sources.mjs",
  "prebuild": "node ../_template/scripts/sync-shared-sources.mjs",
  ...
}
```

### Step 4: ツールの `.gitignore` に `src/data/sources/` があるか確認
無ければ追加。これがないとキャッシュが git に入ってしまう。

### Step 5: 動作確認
```bash
cd <ツールディレクトリ>
npm run build
```
- prebuild で sync が走り、`src/data/sources/<key>/` にファイルがコピーされること
- ビルドが成功すること
- (テストがあれば)`npm test` も全 pass すること

### Step 6: ダッシュボードに登録
`ツール管理ダッシュボード/data/tools/<tool>.json` の `dataSources` 配列に追加:
```json
{
  "label": "人間が読むラベル",
  "filePath": "../_shared/data/sources/<key>/source.json",
  "extractionMethod": "shared-source-json"
}
```

これでダッシュボードの「データ一覧」ページに自動的に表示される。

### 重要原則(追加時)
- **原本データは bytewise コピー or 慎重な手書き**。数値/閾値/文字列の改変は禁止
- **single source of truth**: ツール内に重複保持しない
- **consumers の更新を忘れない**: 後から別ツールが同じソースを使うようになったら追記

---

## 既存データを更新するとき

## いつ実行するか

- Desktop Scheduled Task の鮮度チェックがアラートを出した時
- `_shared/data/sources/*/source.json` の `checkWindow` 期間内なのに `lastChecked` が古いソースがある時
- 法令改正・年度切り替えの発表があった時
- ダッシュボードの「データ一覧」ページで要更新マークが付いた時

## 更新フロー

### Step 1: 対象ソースを特定

`_shared/data/sources/*/source.json` をすべて読み、以下を満たすソースをリストアップ:
- `lastChecked` が今日から見て古い
- 現在日時が `checkWindow` の更新時期に該当する

### Step 2: データ形式を判定して取得方法を分岐

`source.json` の `sourceUrl`(または `sourceUrls`)を確認し、以下のいずれかに分類:

#### A. HTMLページ(国税庁タックスアンサー等)— 完全自動
1. WebFetch で取得
2. `_shared/data/sources/<key>/_raw/原典.txt` に上書き保存
3. `git diff` で差分確認
4. ロジック影響があれば `data.ts`(または `.md`)を更新
5. `source.json` の `lastChecked` を今日に更新

#### B. テキスト層付きPDF — 半自動
1. PDFを `_shared/data/sources/<key>/_raw/原典.pdf` にダウンロード
2. Read ツールで読み取れるか試す → 読めれば A. と同じ流れ
3. 文字化け / 空 → 画像PDFと判定 → C. へ

#### C. 画像スキャンPDF — ユーザー連携(Claudeは直接OCRできない)
Claude の Read ツールでテキストが取れない、または明らかに OCR が必要な PDF はこの分岐。

1. **Claude側**: 該当ソースをまとめて以下の形式でユーザーに提示

   ```
   | source key | PDFのURL | 保存先(あなたが操作してください) |
   |---|---|---|
   | nta-xxx | https://...pdf | _shared/data/sources/nta-xxx/_raw/原典.txt |
   ```

2. **ユーザー側の作業**:
   - 表のPDFをブラウザでダウンロード
   - Adobe Acrobat 等で OCR 実行 → テキスト書き出し
   - 表の保存先パスにテキストを上書き保存
   - Claude に「`_raw/` を更新したので続きをお願い」と伝える

3. **Claude側(続き)**: ユーザーから合図を受けたら
   - `git diff` で `_raw/` の差分確認
   - ロジック影響があれば `data.ts`(または `.md`)を更新
   - `source.json` の `lastChecked` を今日に更新

### Step 3: source.json を更新

ソースを処理したら必ず以下を更新:
- `lastChecked`: 今日の日付
- `sourceLastModified`: 原典に書かれていた最終更新日(変更があった場合のみ)

### Step 4: 影響を受けるツールをユーザーに通知

`source.json` の `consumers` 配列に列挙されている全ツールに対して、以下を伝える:

```
更新したソース: <key>
反映されるツール: <consumers の一覧>
これらのツールは次回 npm run build 実行時に自動的に新しいデータを取り込みます。
```

### Step 5: コミット

```bash
git add _shared/data/sources/<key>/
git commit -m "データ更新: <ソース名> (YYYY年度改正)"
```

## 重要原則

- **編集対象は常に `_shared/data/sources/<key>/`**。プロジェクト内の `src/data/sources/` は触らない(キャッシュであり、prebuild で上書きされる)
- **`_raw/` の差分は必ず Git に残す**。これが「いつ何が変わったか」のログそのもの
- **差分なしでも `lastChecked` は更新する**。次の checkWindow までアラートが出なくなる
- **`sourceUrls` が複数ある場合は1つずつ確認**。その中で1つでも変更があったら処理する
- **画像PDFはユーザーに OCR を依頼**。Claude の Read で読めないものを無理に処理しない

## 現状の前提(2026-04 時点)

今あるツール3つ(届出チェッカー / 経費判定ツール / 法人化シミュレーター)が参照しているデータには **画像PDFは含まれない**(全てHTMLページか、せいぜいテキスト層付きPDF)。Step 2-C の分業フローは将来 法令告示PDF等を取り込む場面に備えた予備手順。

## 関連ファイル / 場所

- `products/_shared/data/sources/` — 全ソースの正本ルート
- `products/_shared/data/sources/<key>/source.json` — メタデータ
- `products/_shared/data/sources/<key>/_raw/` — 全文ダンプ
- `products/_shared/data/sources/<key>/data.ts` または `*.md` — 正本データ
- `products/<project>/data-sources.json` — 各ツールの使用宣言
- `products/_template/scripts/sync-shared-sources.mjs` — sync スクリプト本体
- ダッシュボードの「データ一覧」ページ — 全ソースを横串で確認
