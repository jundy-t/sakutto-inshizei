/**
 * 結果画面
 * - 課税文書: 税額 + 根拠 + 軽減措置 + 注意事項
 * - 不課税文書: 理由 + 注意（caveat）
 * - 定額課税: 税額
 */

import { ShareButton } from './shared/ShareButton';
import { PrintButton } from './shared/PrintButton';
import type { ClassificationResult, TaxResult } from '../core/types';

interface ResultScreenProps {
  classification: ClassificationResult | null;
  taxResult: TaxResult | null;
  onBack: () => void;
  onRetry: () => void;
}

export function ResultScreen({ classification, taxResult, onBack, onRetry }: ResultScreenProps) {
  if (!classification) return null;

  return (
    <div className="space-y-6">
      {/* 不課税の場合 */}
      {classification.type === 'non_taxable' && (
        <section className="bg-card border-2 border-accent rounded-2xl p-6">
          <div className="text-xs text-text-muted mb-1">判定結果</div>
          <div className="flex items-start gap-3 mt-2">
            <span className="text-3xl">✅</span>
            <div>
              <div className="text-xl font-bold text-accent-light">
                印紙税はかかりません
              </div>
              <p className="text-sm text-text-muted mt-2">
                {classification.reason}
              </p>
              {classification.caveat && (
                <div className="mt-3 bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs text-text">
                  <span className="font-bold">⚠ 注意: </span>
                  {classification.caveat}
                </div>
              )}
              <p className="text-xs text-text-muted mt-2">
                出典: <a href={classification.source} target="_blank" rel="noopener noreferrer" className="underline">{classification.source}</a>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 課税文書の場合 */}
      {(classification.type === 'taxable' || classification.type === 'fixed') && taxResult && (
        <>
          <section className="bg-card border-2 border-primary rounded-2xl p-6">
            <div className="text-xs text-text-muted mb-1">判定結果</div>
            <div className="text-3xl font-bold text-primary-light mt-1">
              {taxResult.taxAmount === 0 ? (
                '非課税'
              ) : (
                <>{taxResult.taxAmount.toLocaleString()} 円</>
              )}
            </div>
            {taxResult.taxAmount > 0 && (
              <div className="text-sm text-text-muted mt-1">
                第{taxResult.classNumber.replace('-', '号の')}号文書
              </div>
            )}

            {/* 軽減措置の表示 */}
            {taxResult.isReduction && taxResult.reductionSaving && (
              <div className="mt-4 bg-accent/10 border border-accent/30 rounded-lg p-3">
                <div className="text-sm font-bold text-accent-light">
                  軽減措置が適用されました
                </div>
                <div className="text-xs text-text-muted mt-1">
                  通常より {taxResult.reductionSaving.toLocaleString()} 円安くなっています（〜2027年3月31日）
                </div>
              </div>
            )}

            {/* 消費税の説明 */}
            {taxResult.consumptionTaxNote && (
              <div className="mt-3 text-xs text-text-muted bg-card-hover rounded-lg p-3">
                💡 {taxResult.consumptionTaxNote}
              </div>
            )}
          </section>

          {/* 根拠条文 */}
          <section className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-bold text-text mb-2">根拠</h3>
            <ul className="space-y-1">
              {taxResult.legalBasis.map((basis, i) => (
                <li key={i} className="text-xs text-text-muted">
                  {basis}
                </li>
              ))}
            </ul>
          </section>

          {/* 注意事項 */}
          {taxResult.warnings.length > 0 && (
            <section className="bg-warning/5 border border-warning/20 rounded-xl p-4">
              <h3 className="text-sm font-bold text-warning mb-2">⚠ 注意事項</h3>
              <ul className="space-y-1">
                {taxResult.warnings.map((warning, i) => (
                  <li key={i} className="text-xs text-text-muted">
                    • {warning}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3 no-print">
        <ShareButton text="サクッと印紙税で契約書の印紙税額を判定しました" />
        <PrintButton />
      </div>

      <div className="space-y-2 no-print">
        <button
          type="button"
          onClick={onRetry}
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold rounded-xl py-3 transition-colors"
        >
          別の文書を判定する
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-sm text-text-muted hover:text-text py-2"
        >
          ← トップに戻る
        </button>
      </div>
    </div>
  );
}
