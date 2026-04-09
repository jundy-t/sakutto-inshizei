import { ThemeToggle } from '../shared/ThemeToggle';

export function Header() {
  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-primary-light tracking-tight truncate">
            サクッと印紙税
          </h1>
          <p className="text-sm text-text-muted mt-0.5 truncate">
            契約書・領収書の印紙税額をウィザード形式で判定。第1号〜第20号全号対応、不動産軽減措置対応。 | 無料・登録不要
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs bg-accent/10 text-accent-light px-2 py-1 rounded font-medium">
            2026年度対応
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
