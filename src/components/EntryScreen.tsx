/**
 * 入口画面
 * - 電子契約の案内（情報掲示、質問ではない）
 * - 早見表 or ウィザードの選択
 */

interface EntryScreenProps {
  onGoTable: () => void;
  onGoWizard: () => void;
}

export function EntryScreen({ onGoTable, onGoWizard }: EntryScreenProps) {
  return (
    <div className="space-y-6">
      {/* 電子契約の案内 */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-text">
        <div className="font-bold mb-1">💡 電子契約なら印紙税は不要です</div>
        <p className="text-xs text-text-muted leading-relaxed">
          メール・クラウド署名（クラウドサイン、DocuSign 等）で作成した文書には印紙税はかかりません。
          以下は<strong className="text-text">紙の文書</strong>の印紙税を判定するツールです。
        </p>
        <p className="text-xs text-text-muted mt-1">
          出典: <a href="https://www.nta.go.jp/law/shitsugi/inshi/02/10.htm" target="_blank" rel="noopener noreferrer" className="underline text-primary-light">国税庁 質疑応答事例</a>
        </p>
      </div>

      {/* メイン選択 */}
      <div className="text-center space-y-2 py-2">
        <h2 className="text-xl sm:text-2xl font-bold text-text">
          この文書、印紙はいくら？
        </h2>
        <p className="text-sm text-text-muted">
          契約書・領収書の印紙税額を無料で判定します
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* ウィザード（差別化の核） */}
        <button
          type="button"
          onClick={onGoWizard}
          className="bg-card hover:bg-card-hover border-2 border-primary rounded-xl p-6 text-left transition-colors"
        >
          <div className="text-lg font-bold text-primary-light mb-2">
            ウィザードで判定
          </div>
          <p className="text-sm text-text-muted">
            質問に答えるだけで文書の種類と印紙税額を判定します。種類がわからなくてもOK。
          </p>
          <div className="mt-3 text-xs text-accent-light font-medium">
            最短1問・最大3問で完了 →
          </div>
        </button>

        {/* 早見表 */}
        <button
          type="button"
          onClick={onGoTable}
          className="bg-card hover:bg-card-hover border border-border rounded-xl p-6 text-left transition-colors"
        >
          <div className="text-lg font-bold text-text mb-2">
            早見表で調べる
          </div>
          <p className="text-sm text-text-muted">
            文書の種類がわかっている方向け。第1号〜第20号の税額を一覧で確認できます。
          </p>
          <div className="mt-3 text-xs text-text-muted">
            全20号対応 →
          </div>
        </button>
      </div>

      {/* 補足情報 */}
      <div className="bg-card rounded-xl border border-border p-4 text-xs text-text-muted space-y-1">
        <div className="font-bold text-text">📋 このツールでできること</div>
        <ul className="list-disc list-inside space-y-0.5">
          <li>第1号〜第20号の全文書に対応</li>
          <li>不動産譲渡・建設工事請負の軽減措置（〜2027年3月）に対応</li>
          <li>消費税の区分記載による判定</li>
          <li>不課税文書（建物賃貸借・委任契約等）の案内</li>
          <li>営業に関しない受取書の判定</li>
        </ul>
      </div>
    </div>
  );
}
