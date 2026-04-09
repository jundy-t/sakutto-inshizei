export function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-text-muted space-y-2">
        <p className="font-medium">
          ※ 本ツールは一般的な情報提供を目的としており、個別の法的助言ではありません。
        </p>
        <p>
          最終的な判断は管轄の行政機関または専門家（税理士・行政書士等）にご確認ください。
        </p>
        <p className="text-xs opacity-70 mt-4">
          &copy; {new Date().getFullYear()} サクッと印紙税
        </p>
      </div>
    </footer>
  );
}
