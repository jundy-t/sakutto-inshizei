// 公式文書（法令・通達・Q&Aなど）のメタデータ管理
//
// このツールが参照している公式文書を一元管理する。
// データ鮮度チェックと更新フローはここに登録された内容に基づいて動作する。
// 詳細は src/data/sources/README.md と .claude/skills/data-update/SKILL.md を参照。

export interface DataSource {
  /** ソース識別キー */
  key: string;
  /** 表示名 */
  name: string;
  /** 原典URL */
  sourceUrl: string;
  /** 改正のお知らせ・新旧対照表のURL（あれば。年次改正時に最初に見る） */
  amendmentInfoUrl?: string;
  /** 原典ページに記載されている最終更新日 (YYYY-MM-DD) */
  sourceLastModified: string;
  /** 自分が最後に確認した日 (YYYY-MM-DD) */
  lastChecked: string;
  /** 実際にデータ/ロジックを更新した日 (YYYY-MM-DD) */
  lastUpdated: string;
  /** 抜粋版ファイル (src/data/sources/*.md) */
  sourceFile?: string;
  /** 全文ダンプ (src/data/sources/_raw/*.txt)。差分検知用 */
  rawSnapshot?: string;
  /** チェックすべき期間 (例: "12-15 〜 04-30")。年次改正のタイミング */
  checkWindow?: string;
}

export const DATA_METADATA: { sources: Record<string, DataSource> } = {
  sources: {
    // TODO: ツールで参照する公式文書をここに登録してください。
    // 例:
    // taiyounensuu: {
    //   key: 'taiyounensuu',
    //   name: '減価償却資産の耐用年数等に関する省令 別表',
    //   sourceUrl: 'https://www.nta.go.jp/.../bekkou.pdf',
    //   amendmentInfoUrl: 'https://www.nta.go.jp/.../kaisei.htm',
    //   sourceLastModified: '2025-04-01',
    //   lastChecked: '2026-04-06',
    //   lastUpdated: '2026-04-06',
    //   sourceFile: 'src/data/sources/耐用年数省令-別表.md',
    //   rawSnapshot: 'src/data/sources/_raw/耐用年数省令-別表.txt',
    //   checkWindow: '12-15 〜 04-30',
    // },
  },
};
