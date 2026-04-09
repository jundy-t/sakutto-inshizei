# _template — 個人事業主向けツール 共通テンプレート

新しいツールを作る時はこのフォルダをコピーしてスタートします。React 19 + TypeScript + Vite + Tailwind v4 のスタック、共通レイアウト・統一フィードバック・GA4・Claudeデータ更新スキルを最初から組み込み済み。

## 新ツール作成手順

### 1. コピー

```bash
cp -r products/_template products/<新ツール名>
cd products/<新ツール名>
```

### 2. プレースホルダ置換

以下5つのプレースホルダを全ファイルから置換します（`package.json` の `"name": "tool-template"` も新ツールslugに変更）。

| プレースホルダ | 例 | 用途 |
|---|---|---|
| `サクッと印紙税` | `経費判定ツール` | ツール表示名 |
| `sakutto-inshizei` | `keihi-hantei` | package.json name / フォルダ名 |
| `https://sakutto-inshizei.haraochi.jp` | `https://keihi-hantei.haraochi.jp/` | 公開URL |
| `G-XXXXXXXXXX` | `G-XXXXXXXXXX` | GA4測定ID |
| `契約書・領収書の印紙税額をウィザード形式で判定。第1号〜第20号全号対応、不動産軽減措置対応。` | `経費かどうかを3秒で判定` | メタ説明文 |

検索: `grep -rn 'サクッと印紙税\|sakutto-inshizei\|https://sakutto-inshizei.haraochi.jp\|G-XXXXXXXXXX\|契約書・領収書の印紙税額をウィザード形式で判定。第1号〜第20号全号対応、不動産軽減措置対応。' .`

### 3. インストール & 起動確認

```bash
npm install
npm run dev
```

ブラウザで Header / Footer / フィードバックフォームが表示されればOK。

### 4. 実装

- `src/core/` — ビジネスロジック（計算・判定・データ加工）
- `src/data/` — マスターデータ。`dataMetadata.ts` で `lastChecked` を管理する
- `src/data/sources/` — 公式文書（法令・通達・Q&Aなど）の抜粋＆全文ダンプ。詳細は [sources/README.md](src/data/sources/README.md)
- `src/components/` — UI コンポーネント
- `src/App.tsx` — ルートコンポーネント

### 5. データ更新スキルを埋める

ツールがマスターデータを持つ場合:
- `.claude/skills/data-update/SKILL.md` の TODO を埋める
- `src/data/dataMetadata.ts` を作成

データを持たない場合:
- `.claude/skills/data-update/` フォルダごと削除

### 6. Git初期化 & ダッシュボード登録

```bash
git init
git add .
git commit -m "initial commit"
```

ツール管理ダッシュボードの `data/tools/<新ツール名>.json` に登録。

### 7. デプロイ設定

```bash
cp .env.example .env
# .env を編集:
#   - FTP_USER, FTP_PASSWORD は既存ツールの .env からコピー（全ツール共通）
#   - FTP_REMOTE_DIR を新ツールのサブドメインパスに書き換え
npm run deploy
```

`npm run deploy` で `npm run build` → `dist/` を ConoHa WING に FTPS（暗号化FTP）転送します。
古いハッシュ付きファイル（`assets/index-XXX.js` 等）は自動掃除されます。

#### 初回のみ: ConoHa WING でFTPアカウントを作成

1. ConoHa WING コントロールパネル → **haraochi.jp** に切り替え
2. 「サイト管理 > FTP > +FTPアカウント」
3. **接続許可ディレクトリ: 全て許可** （配下の全サブドメインに到達可能）
4. 強いパスワード（20文字以上）を設定し、`.env` にのみ保存
5. 1度作れば全ツール共通で使い回せる

`.env` は `.gitignore` で除外されるので Git に上がりません。

## 含まれているもの

- ✅ React 19 + Vite + TS + Tailwind v4 設定一式
- ✅ ESLint + vitest 設定
- ✅ Header / Footer / StepIndicator
- ✅ FeedbackSection（Google Forms統一フィードバック）
- ✅ gtag.ts（GA4トラッキングヘルパー）
- ✅ `.claude/skills/` 2スキル: `data-update`（データ更新手順）/ `verify-with-examples`（実例ベース検証方法論）
- ✅ index.html（GA4スクリプト・OGP・日本語フォント）

## テンプレートを改善したい時

新ツールを作っていて「これ全ツールに必要だな」と思った機能があれば、`_template` 側に逆輸入してください。テンプレートは育てていくものです。
