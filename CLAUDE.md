# サクッと印紙税

個人事業主・中小企業向けの**印紙税額 判定ツール**。
契約書・領収書の種類をウィザード形式で特定し、印紙税額を判定する。
第1号〜第20号 全号対応、不動産軽減措置（〜2027/3/31）対応。
React 19 + TypeScript + Vite + Tailwind 4 + ConoHa WING（FTPS デプロイ）。

公開URL: https://sakutto-inshizei.haraochi.jp/

> ワークスペース全体の構成は親フォルダの [`../CLAUDE.md`](../CLAUDE.md) を参照。

## 絶対に守るルール

### 1. `src/data/sources/` は編集禁止
このディレクトリは `_shared/data/sources/nta-inshizei/` から `predev` / `prebuild` フックで自動同期されるキャッシュ。
編集してもビルド時に上書きされる。**変更したい場合は必ず `_shared` 側を編集する**。
詳細手順は `data-update` Skill を起動して参照。

### 2. `.env` には FTP パスワードが入っている
**絶対に git にコミットしない。Read もしない。**
`.gitignore` で除外済み + `.claude/settings.json` の `permissions.deny` でも保護済み。
新しい環境変数を追加するときは `.env.example` にも反映する。

## 印紙税法の前提知識

### 課税文書の判定原則
- 課税文書は**文書の実質（記載内容）で判断**する。文書の名称（タイトル）ではない
- 「契約書」という名称がなくても、契約の成立を証する文書は課税対象
- 印紙税法 別表第一の「課税物件」「定義」「非課税物件」の3列で判定

### 複数号該当時の所属決定（通則）
- 第1号 > 第2号 > 第3号〜第17号（号数が小さい方が優先）
- 例: 売買契約書（1号）兼請負契約書（2号）→ 1号として課税

### 消費税の扱い
- 契約書に消費税額が**区分記載**されている場合、消費税額を除いた金額が記載金額
- 区分記載がない場合は税込金額が記載金額
- ウィザードで「消費税の記載方法」を質問して自動判定する

### 不動産軽減措置（重要な期限あり）
- 対象: 不動産譲渡契約書（第1号の1）・建設工事請負契約書（第2号）
- 期限: **2027年3月31日まで**
- `_shared/data/sources/nta-inshizei/source.json` の `checkWindow` で管理
- **2027年初に延長・廃止を必ず確認**すること

### 電子契約（中立スタンス）
- 事実: 電磁的記録は印紙税の課税対象外（2005年国会答弁、国税庁Q&A）
- ウィザードで「紙 or 電子」を質問し、電子なら「印紙税不要」で即終了
- **特定の電子契約サービスを推奨しない**（中立を維持）

## データソース（6系統）

正本: `_shared/data/sources/nta-inshizei/`（[source.json](../_shared/data/sources/nta-inshizei/source.json) 参照）

| 系統 | 原典 | 用途 |
|---|---|---|
| 税額表 | 国税庁 No.7140 PDF | 税額計算テーブル |
| 文書定義 | e-Gov 印紙税法 別表第一 | ウィザード分岐ロジック |
| 通則 | 別表第一末尾 + 国税庁Q&A | 複数号該当・消費税ルール |
| 基本通達 | 国税庁 印紙税法基本通達 | 境界事例の判定根拠 |
| 軽減措置 | 国税庁 No.7108 | 第1号の1/第2号の軽減税率 |
| 電子契約根拠 | 国税庁Q&A + 国会答弁 | 非課税の根拠表示 |

## UX 設計方針

- **ウィザード型**（サクッと耐用年数を参考）
- 暖色クリーム配色（シリーズ共通）
- 入口で「文書種類が分かっている → 早見表」「分からない → ウィザード判定」を分岐
- ウィザード: 契約種類 → 不動産関与 → 継続取引 → 紙/電子 → 金額 → 結果

## 共通データソース

このプロジェクトが使う共通データソース（[data-sources.json](data-sources.json) で宣言）:
- `nta-inshizei` — 印紙税額一覧表（第1号〜第20号・軽減措置込み）

正本は `_shared/data/sources/nta-inshizei/`。更新は `data-update` Skill に従う。

## 開発コマンド

```bash
npm run dev      # 開発サーバー（predev で _shared から同期）
npm run build    # 本番ビルド（prebuild で _shared から同期）
npm run lint     # ESLint
npm run test     # vitest
npm run deploy   # ビルド + ConoHa WING への FTPS デプロイ
```

## デプロイ

ConoHa WING に **FTPS で自動デプロイ**:
```bash
npm run deploy
```
内部で `npm run build && node --env-file=.env scripts/deploy.mjs` を実行。
`.env` に `FTP_HOST` / `FTP_USER` / `FTP_PASSWORD` / `FTP_REMOTE_DIR` が必要（[.env.example](.env.example) 参照）。
