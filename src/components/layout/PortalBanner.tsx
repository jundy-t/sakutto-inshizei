/**
 * サブドメインツール → メインポータル (haraochi.jp) への戻り導線。
 *
 * 設計根拠: knowledge/seo-knowledge/philosophy/portal-vs-subdomain-content-roles.md
 * - サブドメインは特定機能に特化、メインポータルは discovery hub の役割
 * - ユーザーが「他のお困りごと向けツールも存在する」と即気づける目立つ位置に配置
 * - Header 本体には触らない (.claude/rules/header-sp-wrap.md の制約を回避)
 */
export function PortalBanner() {
  return (
    <a
      href="https://haraochi.jp/"
      className="block bg-card-hover border-b border-border text-center text-xs text-text-muted py-1.5 px-4 hover:text-primary-light transition-colors"
    >
      ← 他のお困りごと向け無料ツールも探せる: <span className="font-medium">サクッと</span>
    </a>
  );
}
