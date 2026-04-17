/**
 * 結果画面
 * - 課税文書: 税額 + 根拠 + 軽減措置 + 注意事項
 * - 不課税文書: 理由 + 注意（caveat）
 * - 定額課税: 税額
 * - ハイブリッドリスクの高い号は「追加検討」アコーディオンを表示し、
 *   通則3適用後の最終号・税額を再計算する
 */

import { useMemo, useState } from 'react';
import { ShareButton } from './shared/ShareButton';
import { PrintButton } from './shared/PrintButton';
import { calculateTax } from '../core/calculateTax';
import { applyRule3 } from '../core/applyRule3';
import { DOCUMENT_CLASSES } from '../data/sources/nta-inshizei/data';
import type { ClassificationResult, TaxResult, WizardAnswers, HybridOption } from '../core/types';

interface ResultScreenProps {
  classification: ClassificationResult | null;
  taxResult: TaxResult | null;
  wizardAnswers: WizardAnswers | null;
  onBack: () => void;
  onRetry: () => void;
}

export function ResultScreen({ classification, taxResult, wizardAnswers, onBack, onRetry }: ResultScreenProps) {
  if (!classification) return null;

  // hybridOptions を持つ課税/定額結果のみ、追加検討UIを出す
  const hybridOptions =
    (classification.type === 'taxable' || classification.type === 'fixed') && classification.hybridOptions
      ? classification.hybridOptions
      : null;

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

            {/* 出典 */}
            <p className="text-xs text-text-muted mt-3">
              出典: <a href={classification.source} target="_blank" rel="noopener noreferrer" className="underline">{classification.source}</a>
            </p>
          </section>

          {/* 変更契約書の場合の注記 */}
          {wizardAnswers?.isAmendment && wizardAnswers.priorIdentifiable && (
            <section className="bg-accent/5 border border-accent/20 rounded-xl p-4">
              <h3 className="text-sm font-bold text-accent-light mb-2">変更契約書の扱い</h3>
              {wizardAnswers.amendmentDirection === 'decrease' ? (
                <p className="text-xs text-text-muted">
                  変更前の契約書が特定できる減額変更のため、記載金額なしとして扱っています（印紙税200円）。
                  出典: 国税庁 No.7123
                </p>
              ) : wizardAnswers.amendmentDirection === 'increase' && wizardAnswers.amendmentAmount != null ? (
                <p className="text-xs text-text-muted">
                  変更前の契約書が特定できる増額変更のため、増額分（{wizardAnswers.amendmentAmount.toLocaleString()}円）のみを記載金額として計算しています。
                  出典: 国税庁 No.7123
                </p>
              ) : null}
            </section>
          )}

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

          {/* 追加検討（複数号該当チェック） */}
          {hybridOptions && (
            <HybridSection
              primaryClass={taxResult.classNumber}
              primaryIsReduction={taxResult.isReduction}
              options={hybridOptions}
              wizardAnswers={wizardAnswers}
            />
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

// ─── 追加検討（通則3適用）セクション ─────────────────────────

interface HybridSectionProps {
  primaryClass: string;
  primaryIsReduction: boolean;
  options: readonly HybridOption[];
  wizardAnswers: WizardAnswers | null;
}

/**
 * 「他の要素もありませんか？」のアコーディオンを表示し、
 * チェックに応じて通則3を適用した最終号・税額を算出する。
 */
/** 数字文字列を3桁カンマ区切りにフォーマット */
function formatWithCommas(value: string): string {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString();
}

/** カンマ除去して整数パース。空文字は null */
function parseAmount(s: string): number | null {
  const n = parseInt(s.replace(/,/g, ''), 10);
  return isNaN(n) ? null : n;
}

/** 号番号から金額入力欄のユーザー向けラベルを返す（契約書の記載内容に合わせた表現） */
function splitAmountLabel(classNumber: string): string {
  switch (classNumber) {
    case '1-1': return '売買・譲渡分の金額';
    case '1-2': return '土地賃借権分の金額';
    case '1-3': return '金銭貸借分の金額';
    case '1-4': return '運送契約分の金額';
    case '2': return '工事請負分の金額';
    default: return `第${formatClassNumber(classNumber)}号分の金額`;
  }
}

/** 当初号+追加号の組み合わせが 1号系 vs 2号 で金額区分が意味を持つか */
function involves1and2(primaryClass: string, additions: readonly string[]): { n1: string; n2: string } | null {
  const majorOf = (n: string) => parseInt(n.split('-')[0], 10);
  const primaryIs1 = majorOf(primaryClass) === 1;
  const primaryIs2 = majorOf(primaryClass) === 2;
  const addedN1 = additions.find(n => majorOf(n) === 1);
  const addedN2 = additions.find(n => majorOf(n) === 2);
  if (primaryIs1 && addedN2) return { n1: primaryClass, n2: addedN2 };
  if (primaryIs2 && addedN1) return { n1: addedN1, n2: primaryClass };
  return null;
}

function HybridSection({ primaryClass, primaryIsReduction, options, wizardAnswers }: HybridSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(() => new Set());

  // 金額区分サブ質問の状態
  const [splitMode, setSplitMode] = useState<'unknown' | 'yes' | 'no'>('unknown');
  const [splitAmt1Str, setSplitAmt1Str] = useState('');
  const [splitAmt2Str, setSplitAmt2Str] = useState('');

  const toggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // チェック変更時にリセット
    setSplitMode('unknown');
    setSplitAmt1Str('');
    setSplitAmt2Str('');
  };

  // チェック → 追加号リストに変換
  const additions = useMemo(
    () =>
      options
        .filter(opt => checkedIds.has(opt.id))
        .map(opt => opt.linkedClass),
    [options, checkedIds],
  );

  // 1号 vs 2号 の金額区分が意味を持つか
  const splitPair = useMemo(() => involves1and2(primaryClass, additions), [primaryClass, additions]);

  // 金額区分データを構築
  const amountByClass = useMemo(() => {
    if (!splitPair || splitMode !== 'yes') return undefined;
    const a1 = parseAmount(splitAmt1Str);
    const a2 = parseAmount(splitAmt2Str);
    if (a1 === null || a2 === null) return undefined;
    return { [splitPair.n1]: a1, [splitPair.n2]: a2 };
  }, [splitPair, splitMode, splitAmt1Str, splitAmt2Str]);

  // 通則3適用
  const rule3 = useMemo(
    () =>
      applyRule3({
        primary: primaryClass,
        additions,
        amount: wizardAnswers?.amount ?? null,
        amountByClass,
      }),
    [primaryClass, additions, wizardAnswers?.amount, amountByClass],
  );

  // 通則4: 金額区分可能 → 所属号の金額のみが記載金額
  const effectiveAmount = amountByClass?.[rule3.finalClass]
    ?? wizardAnswers?.amount
    ?? null;

  // 号が変わった OR 金額区分で記載金額が変わった場合に再計算
  const amountDiffers = amountByClass != null && effectiveAmount !== (wizardAnswers?.amount ?? null);
  const needsRecalc = rule3.changed || amountDiffers;

  // 最終号が2号に「変わった」場合、軽減措置が建設工事請負なら適用される。
  // ユーザーの契約が建設工事かどうかはツールでは判断できないため、両方の税額を参考表示する。
  const finalIs2Changed = rule3.changed && rule3.finalClass === '2';

  const finalTaxResult = useMemo(() => {
    if (!needsRecalc) return null;
    const finalCls = DOCUMENT_CLASSES.find(d => d.number === rule3.finalClass);
    if (!finalCls) return null;

    if (finalCls.taxType === 'fixed' && finalCls.fixedAmount !== undefined) {
      return {
        amount: finalCls.fixedAmount,
        label: finalCls.label,
        effectiveAmount,
      };
    }

    const taxOpts = {
      taxNotation: (amountByClass ? 'no_tax' : (wizardAnswers?.taxNotation ?? 'no_tax')) as import('../core/types').TaxNotation,
      consumptionTaxAmount: amountByClass ? undefined : wizardAnswers?.consumptionTaxAmount,
      isSpecialBill: wizardAnswers?.isSpecialBill,
    };

    // 号が変わらない場合: 当初の軽減措置を引き継ぎ
    // 号が変わった + 2号: 軽減/通常 両方計算
    // 号が変わった + 2号以外: 軽減不適用
    if (finalIs2Changed) {
      const normal = calculateTax(rule3.finalClass, effectiveAmount, { ...taxOpts, isReduction: false });
      const reduced = calculateTax(rule3.finalClass, effectiveAmount, { ...taxOpts, isReduction: true });
      return {
        amount: normal.taxAmount,
        reducedAmount: reduced.taxAmount,
        label: normal.classLabel,
        effectiveAmount,
        showBothReduction: reduced.taxAmount < normal.taxAmount,
      };
    }

    const recalc = calculateTax(rule3.finalClass, effectiveAmount, {
      ...taxOpts,
      isReduction: rule3.changed ? false : primaryIsReduction,
    });
    return { amount: recalc.taxAmount, label: recalc.classLabel, effectiveAmount };
  }, [needsRecalc, rule3, effectiveAmount, amountByClass, wizardAnswers, primaryIsReduction, finalIs2Changed]);

  return (
    <section className="bg-card rounded-xl border border-border p-4 no-print">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={expanded}
      >
        <div>
          <h3 className="text-sm font-bold text-text">
            念のため：他の要素もありませんか？
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            1通の書類に複数の性質が含まれる場合、所属する号が変わることがあります（通則3）
          </p>
        </div>
        <span className="text-text-muted text-sm ml-2">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <p className="text-xs text-text-muted">
            この書類に<strong className="text-text">当てはまる要素</strong>があればチェックしてください。該当する号がある場合、印紙税法 別表第一 通則3 に基づき最終的に所属する号が機械的に決まります。
          </p>

          <div className="space-y-2">
            {options.map(opt => (
              <label
                key={opt.id}
                className="flex items-start gap-3 p-3 bg-bg rounded-lg border border-border hover:bg-card-hover cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checkedIds.has(opt.id)}
                  onChange={() => toggleCheck(opt.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-text">{opt.label}</div>
                  <div className="text-xs text-text-muted mt-0.5">{opt.helpText}</div>
                </div>
              </label>
            ))}
          </div>

          {/* 金額区分サブ質問（1号 vs 2号の場合のみ） */}
          {splitPair && additions.length > 0 && (
            <div className="bg-bg rounded-lg border border-border p-4 space-y-3">
              <p className="text-sm font-medium text-text">
                契約書上で、それぞれの金額が別々に記載されていますか？
              </p>
              <p className="text-xs text-text-muted">
                金額が区分記載されている場合、第2号の金額が第1号を超えると所属号が変わることがあります（通則3ロ例外 / 通則4）。
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="splitMode"
                    checked={splitMode === 'no' || splitMode === 'unknown'}
                    onChange={() => setSplitMode('no')}
                  />
                  <span className="text-sm text-text">いいえ / わからない（原則どおりで判定）</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="splitMode"
                    checked={splitMode === 'yes'}
                    onChange={() => setSplitMode('yes')}
                  />
                  <span className="text-sm text-text">はい、それぞれの金額が分かる</span>
                </label>
              </div>
              {splitMode === 'yes' && (
                <div className="grid gap-3 sm:grid-cols-2 mt-2">
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">
                      {splitAmountLabel(splitPair.n1)}（円）
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={splitAmt1Str}
                      onChange={e => setSplitAmt1Str(formatWithCommas(e.target.value))}
                      placeholder="例: 3,000,000"
                      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">
                      {splitAmountLabel(splitPair.n2)}（円）
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={splitAmt2Str}
                      onChange={e => setSplitAmt2Str(formatWithCommas(e.target.value))}
                      placeholder="例: 5,000,000"
                      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {additions.length > 0 && (
            <div className="mt-4 bg-primary/5 border border-primary/30 rounded-lg p-4 space-y-2">
              <div className="text-xs text-text-muted">通則3適用後</div>
              <div className="text-sm text-text">
                <span className="font-bold">
                  当初: 第{formatClassNumber(primaryClass)}号
                </span>
                <span className="mx-2 text-text-muted">→</span>
                <span className="font-bold text-primary-light">
                  最終: 第{formatClassNumber(rule3.finalClass)}号
                </span>
                {!rule3.changed && <span className="text-text-muted text-xs ml-2">（変わらず）</span>}
              </div>
              <p className="text-xs text-text-muted">{rule3.explanation}</p>

              {finalTaxResult && (
                <div className="mt-2 pt-2 border-t border-primary/20">
                  <div className="text-xs text-text-muted">最終号の印紙税額</div>

                  {'showBothReduction' in finalTaxResult && finalTaxResult.showBothReduction ? (
                    /* 号が2号に変わった場合: 建設工事（軽減）とそれ以外（通常）の両方を表示 */
                    <div className="mt-1 space-y-2">
                      <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                        <div className="text-xs font-bold text-accent-light">建設工事請負の場合（軽減措置適用）</div>
                        <div className="text-xl font-bold text-accent-light mt-0.5">
                          {finalTaxResult.reducedAmount === 0 ? '非課税' : `${finalTaxResult.reducedAmount!.toLocaleString()} 円`}
                        </div>
                      </div>
                      <div className="bg-card-hover rounded-lg p-3">
                        <div className="text-xs font-medium text-text-muted">それ以外の請負（物品製造等）の場合</div>
                        <div className="text-lg font-bold text-text-muted mt-0.5">
                          {finalTaxResult.amount === 0 ? '非課税' : `${finalTaxResult.amount.toLocaleString()} 円`}
                        </div>
                      </div>
                      <p className="text-xs text-text-muted">
                        ※ 軽減措置は「建設工事の請負」に限定されます（〜2027年3月31日）。契約内容でご判断ください。
                      </p>
                    </div>
                  ) : (
                    /* 通常表示（号変更なし or 2号以外への変更） */
                    <>
                      <div className="text-xl font-bold text-primary-light mt-0.5">
                        {finalTaxResult.amount === 0 ? '非課税' : `${finalTaxResult.amount.toLocaleString()} 円`}
                      </div>
                      <p className="text-xs text-text-muted mt-1">{finalTaxResult.label}</p>
                    </>
                  )}

                  {finalTaxResult.effectiveAmount != null && amountDiffers && (
                    <p className="text-xs text-text-muted mt-2">
                      💡 通則4により、所属号（第{formatClassNumber(rule3.finalClass)}号）の金額のみ（{finalTaxResult.effectiveAmount.toLocaleString()}円）で税額を計算しています
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-text-muted pt-2 border-t border-primary/20">
                ⚠ 判定が微妙な場合（請負/売買の境界、金額区分の可否など）は、最終判定に税理士・行政書士・税務署への相談を推奨します。
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function formatClassNumber(classNumber: string): string {
  if (classNumber.includes('-')) {
    const [main, sub] = classNumber.split('-');
    return `${main}号の${sub}`;
  }
  return classNumber;
}
