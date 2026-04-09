/**
 * SNS 共有ボタン群
 *
 * - X (Twitter) / LINE / Facebook の各 SNS に直接共有
 * - スマホは「その他」ボタンで navigator.share() のネイティブメニューも呼べる
 *
 * X の intent URL は text と url を別々に渡すと本文が消えることがあるため、
 * 本文に URL を含めて text パラメータ 1 本で渡している。
 *
 * 使い方:
 *   <ShareButton text="動画クリエイターで年間100万円の節税！" hashtags={['法人化']} />
 */

interface Props {
  /** 共有する本文 */
  text: string;
  /** 共有する URL（省略時は現在のページ） */
  url?: string;
  /** ハッシュタグ（# 抜きの配列） */
  hashtags?: string[];
  /** ボタンの追加 className */
  className?: string;
}

export function ShareButton({ text, url, hashtags = [], className = '' }: Props) {
  const targetUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '');
  const hashtagText = hashtags.length > 0 ? '\n' + hashtags.map((h) => `#${h}`).join(' ') : '';
  const fullText = text + hashtagText;
  // X 用: 本文 + URL を 1 本化（text と url を別パラメータで渡すと URL のみになる現象を回避）
  const fullTextWithUrl = `${fullText}\n${targetUrl}`;

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullTextWithUrl)}`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(targetUrl)}&text=${encodeURIComponent(fullText)}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(targetUrl)}&quote=${encodeURIComponent(fullText)}`;

  const openWindow = (u: string) => window.open(u, '_blank', 'noopener,noreferrer,width=600,height=600');

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: fullText, url: targetUrl });
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className={`no-print ${className}`}>
      <p className="text-xs text-gray-500 mb-2 text-center">結果を共有する</p>
      <div className="flex gap-2 justify-center">
        <ShareIconButton
          label="X (Twitter)"
          color="bg-black text-white hover:bg-gray-800"
          onClick={() => openWindow(xUrl)}
        >
          <XIcon />
        </ShareIconButton>
        <ShareIconButton
          label="LINE"
          color="bg-[#06C755] text-white hover:opacity-90"
          onClick={() => openWindow(lineUrl)}
        >
          <LineIcon />
        </ShareIconButton>
        <ShareIconButton
          label="Facebook"
          color="bg-[#1877F2] text-white hover:opacity-90"
          onClick={() => openWindow(fbUrl)}
        >
          <FacebookIcon />
        </ShareIconButton>
        {hasNativeShare && (
          <ShareIconButton
            label="その他"
            color="bg-gray-100 text-gray-700 hover:bg-gray-200"
            onClick={handleNativeShare}
          >
            <MoreIcon />
          </ShareIconButton>
        )}
      </div>
    </div>
  );
}

function ShareIconButton({
  label,
  color,
  onClick,
  children,
}: {
  label: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl font-bold transition-colors ${color}`}
    >
      {children}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.508.43-.595.06-.024.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.122h1.756c.348 0 .629.283.629.63 0 .344-.282.628-.629.628M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}
