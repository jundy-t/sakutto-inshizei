/**
 * 印刷 / PDF 保存ボタン
 *
 * window.print() で OS の印刷ダイアログを開く。ユーザーは「PDF として保存」を選んで
 * PDF 化できる。ライブラリ不要、テキスト選択可、日本語フォント問題なし。
 *
 * 印刷時の見た目調整は index.css の @media print ルールで行う。
 * このボタン自身も .no-print クラスで印刷除外される。
 *
 * 使い方:
 *   <PrintButton />
 */

interface Props {
  label?: string;
  className?: string;
}

export function PrintButton({ label = '印刷 / PDF保存', className = '' }: Props) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className={`no-print py-3 px-4 border border-border text-text rounded-xl font-medium hover:bg-card-hover transition-colors flex items-center justify-center gap-2 ${className}`}
    >
      <PrintIcon />
      {label}
    </button>
  );
}

function PrintIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}
