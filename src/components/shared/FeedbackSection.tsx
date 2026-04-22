import { useState } from 'react';
import { FEEDBACK_CONFIG } from '../../lib/feedbackConfig';

type Status = 'idle' | 'sending' | 'sent' | 'error';

interface Props {
  context?: Record<string, unknown>;
}

export function FeedbackSection({ context }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [freeText, setFreeText] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = async () => {
    if (rating === null) return;
    setStatus('sending');
    try {
      const formData = new URLSearchParams();
      formData.append(FEEDBACK_CONFIG.fields.toolName, FEEDBACK_CONFIG.toolName);
      formData.append(FEEDBACK_CONFIG.fields.rating, String(rating));
      formData.append(FEEDBACK_CONFIG.fields.freeText, freeText);
      formData.append(FEEDBACK_CONFIG.fields.context, JSON.stringify(context ?? {}));

      await fetch(FEEDBACK_CONFIG.formActionUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-sm text-accent-light text-center">
        ご回答ありがとうございました！改善に役立てます。
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <h3 className="text-sm font-bold text-text">ご利用ありがとうございます</h3>
      <p className="text-xs text-text-muted leading-relaxed">
        ご意見・ご質問・判定結果に関するお問い合わせもこちらから承ります。<br />
        返信を希望される場合はご連絡先(メールアドレス等)もご記入ください。
      </p>

      <div className="space-y-2">
        <p className="text-sm text-text-muted">このツールは役に立ちましたか？</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              aria-label={`5段階中${star}`}
              className="text-3xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded cursor-pointer"
            >
              <span className={rating !== null && star <= rating ? 'text-primary-light' : 'text-text-muted opacity-40'}>
                &#9733;
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="feedback-text" className="text-sm text-text-muted">
          ご意見・ご質問・お問い合わせ（任意）
        </label>
        <textarea
          id="feedback-text"
          rows={3}
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder="使いやすさ、追加してほしい機能、判定結果の疑問点、お問い合わせ内容など"
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={rating === null || status === 'sending'}
        className="w-full py-3 bg-accent text-white rounded-xl font-bold transition-colors hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {status === 'sending' ? '送信中...' : '送信する'}
      </button>

      {status === 'error' && (
        <p className="text-sm text-danger text-center">
          送信に失敗しました。もう一度お試しください。
        </p>
      )}
    </div>
  );
}
