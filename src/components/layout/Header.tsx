import { ThemeToggle } from '../shared/ThemeToggle';

interface HeaderProps {
  onHomeClick?: () => void;
}

export function Header({ onHomeClick }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1
            className="text-xl font-bold text-primary-light tracking-tight truncate cursor-pointer"
            onClick={onHomeClick}
          >
            サクッと印紙税
          </h1>
          <p className="text-sm text-text-muted mt-0.5 truncate">
            契約書・領収書・業務委託・不動産売買・請負契約などの印紙税を即判定 | 軽減措置・電子契約対応
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
