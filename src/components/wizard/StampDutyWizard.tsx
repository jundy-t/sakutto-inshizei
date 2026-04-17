/**
 * 印紙税判定ウィザード（最大3ステップ）
 *
 * Step1: 何の文書か（doc_type）
 * Step1b: 継続性（basic_agreement の場合のみ）
 * Step2: 不動産の関与（必要な場合のみ）
 * Step3: 金額 + 消費税（taxable の場合のみ）
 */

import { useState, useCallback } from 'react';
import type { WizardAnswers, DocCategory, RealEstateInvolvement, ContinuityType, TaxNotation } from '../../core/types';

type WizardStep = 'doc_type' | 'service_detail' | 'continuity' | 'real_estate' | 'receipt_business' | 'amount' | 'other_purpose' | 'consult_expert';

interface StampDutyWizardProps {
  onComplete: (answers: WizardAnswers) => void;
  onBack: () => void;
}

const DOC_CATEGORIES: { value: DocCategory; label: string; description: string }[] = [
  { value: 'sale_transfer', label: '売買・譲渡の契約書', description: '不動産・営業・権利の売買' },
  { value: 'construction', label: '工事・製造の請負契約書', description: '建設工事、物品製造、修理等' },
  { value: 'service', label: '業務委託・サービス契約書', description: 'コンサル、デザイン、IT開発等' },
  { value: 'lease', label: '賃貸借契約書', description: '土地・建物の賃貸借' },
  { value: 'loan', label: '金銭貸借・借用証書', description: 'お金の貸し借り' },
  { value: 'receipt', label: '領収書・受取書', description: 'お金を受け取った証拠' },
  { value: 'bill_of_exchange', label: '手形', description: '約束手形・為替手形' },
  { value: 'corporate', label: '会社設立・合併・分割', description: '定款、合併契約書等' },
  { value: 'basic_agreement', label: '取引基本契約書', description: '継続取引の基本となる契約' },
  { value: 'other', label: 'その他・よくわからない', description: '上記に当てはまらない' },
];

const REAL_ESTATE_OPTIONS: { value: RealEstateInvolvement; label: string }[] = [
  { value: 'land', label: '土地が関係する' },
  { value: 'building', label: '建物のみ' },
  { value: 'land_and_building', label: '土地と建物の両方' },
  { value: 'none', label: '不動産は関係しない' },
];

export function StampDutyWizard({ onComplete, onBack }: StampDutyWizardProps) {
  const [step, setStep] = useState<WizardStep>('doc_type');
  const [answers, setAnswers] = useState<Partial<WizardAnswers>>({});

  const updateAnswers = useCallback((patch: Partial<WizardAnswers>) => {
    setAnswers(prev => ({ ...prev, ...patch }));
  }, []);

  // Step1 の分岐ロジック
  const handleDocCategory = useCallback((category: DocCategory) => {
    updateAnswers({ docCategory: category });

    switch (category) {
      case 'service':
        setStep('service_detail');
        break;
      case 'receipt':
        setStep('receipt_business');
        break;
      case 'loan':
      case 'bill_of_exchange':
        setStep('amount');
        break;
      case 'corporate':
        // 定額 → 即完了
        onComplete({ docCategory: category });
        return;
      case 'basic_agreement':
        setStep('continuity');
        break;
      case 'sale_transfer':
      case 'construction':
      case 'lease':
        setStep('real_estate');
        break;
      case 'other':
        setStep('other_purpose');
        break;
    }
    window.scrollTo(0, 0);
  }, [updateAnswers, onComplete]);

  // 請負/委任の判定
  const handleServiceDetail = useCallback((isUkeoi: boolean) => {
    updateAnswers({ isUkeoi });
    if (!isUkeoi) {
      // 委任 → 即完了（不課税）
      onComplete({ ...answers, docCategory: 'service', isUkeoi: false });
      return;
    }
    setStep('real_estate');
    window.scrollTo(0, 0);
  }, [answers, updateAnswers, onComplete]);

  // 継続性の判定
  const handleContinuity = useCallback((continuity: ContinuityType) => {
    updateAnswers({ continuity });
    if (continuity === 'yes_under_3months_no_renewal') {
      // 非課税 → 即完了
      onComplete({ ...answers, docCategory: 'basic_agreement', continuity });
      return;
    }
    // 第7号定額 → 即完了
    onComplete({ ...answers, docCategory: 'basic_agreement', continuity });
  }, [answers, updateAnswers, onComplete]);

  // 不動産の判定
  const handleRealEstate = useCallback((realEstate: RealEstateInvolvement) => {
    const currentAnswers = { ...answers, realEstate };
    updateAnswers({ realEstate });

    // 不課税チェック
    if (answers.docCategory === 'lease' && realEstate === 'building') {
      onComplete({ ...currentAnswers, docCategory: 'lease' } as WizardAnswers);
      return;
    }
    if (answers.docCategory === 'sale_transfer' && realEstate === 'none') {
      onComplete({ ...currentAnswers, docCategory: 'sale_transfer' } as WizardAnswers);
      return;
    }

    setStep('amount');
    window.scrollTo(0, 0);
  }, [answers, updateAnswers, onComplete]);

  // 営業判定（領収書の場合）
  const handleReceiptBusiness = useCallback((isBusinessActivity: boolean) => {
    updateAnswers({ isBusinessActivity });
    if (!isBusinessActivity) {
      onComplete({ ...answers, docCategory: 'receipt', isBusinessActivity: false } as WizardAnswers);
      return;
    }
    setStep('amount');
    window.scrollTo(0, 0);
  }, [answers, updateAnswers, onComplete]);

  // 金額入力の完了
  const handleAmountSubmit = useCallback((amount: number | null, taxNotation: TaxNotation, consumptionTaxAmount?: number, amendment?: AmendmentInfo) => {
    const finalAnswers: WizardAnswers = {
      ...answers as WizardAnswers,
      amount: amount ?? undefined,
      taxNotation,
      consumptionTaxAmount,
      ...(amendment ? {
        isAmendment: true,
        priorIdentifiable: amendment.priorIdentifiable,
        amendmentDirection: amendment.amendmentDirection,
        amendmentAmount: amendment.amendmentAmount,
      } : {}),
    };
    onComplete(finalAnswers);
  }, [answers, onComplete]);

  // ステップ番号の計算（表示用）
  const stepNumber = step === 'doc_type' || step === 'service_detail' ? 1
    : step === 'continuity' ? 1
    : step === 'real_estate' || step === 'receipt_business' ? 2
    : 3;
  const totalSteps = step === 'amount' ? 3 : step === 'real_estate' || step === 'receipt_business' ? 3 : 2;

  return (
    <div className="space-y-6">
      {/* ステップインジケータ */}
      <div className="text-center">
        <span className="text-xs text-text-muted">
          ステップ {stepNumber} / 最大{totalSteps}
        </span>
      </div>

      {/* Step1: 何の文書? */}
      {step === 'doc_type' && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-text text-center">
            どんな文書ですか？
          </h2>
          <p className="text-sm text-text-muted text-center">
            一番近いものを選んでください
          </p>
          <div className="space-y-2">
            {DOC_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => handleDocCategory(cat.value)}
                className="w-full bg-card hover:bg-card-hover border border-border rounded-lg p-4 text-left transition-colors"
              >
                <div className="font-medium text-text">{cat.label}</div>
                <div className="text-xs text-text-muted mt-0.5">{cat.description}</div>
              </button>
            ))}
          </div>
          <button type="button" onClick={onBack} className="w-full text-sm text-text-muted hover:text-text py-2">
            ← トップに戻る
          </button>
        </section>
      )}

      {/* Step1 追加: 請負 or 委任? */}
      {step === 'service_detail' && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-text text-center">
            仕事の完成を約束する契約ですか？
          </h2>
          <p className="text-sm text-text-muted text-center">
            「成果物を納品する」→ 請負（課税）、「業務を遂行する」→ 委任（不課税）
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleServiceDetail(true)}
              className="bg-card hover:bg-card-hover border border-border rounded-lg p-4 text-left transition-colors"
            >
              <div className="font-medium text-text">はい（請負）</div>
              <div className="text-xs text-text-muted mt-1">
                成果物の完成を約束。工事、制作、開発等。
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleServiceDetail(false)}
              className="bg-card hover:bg-card-hover border border-border rounded-lg p-4 text-left transition-colors"
            >
              <div className="font-medium text-text">いいえ（委任）</div>
              <div className="text-xs text-text-muted mt-1">
                業務の遂行を委託。コンサル、顧問、仲介等。
              </div>
            </button>
          </div>
          <button type="button" onClick={() => setStep('doc_type')} className="w-full text-sm text-text-muted hover:text-text py-2">
            ← 前の質問に戻る
          </button>
        </section>
      )}

      {/* Step1b: 継続的取引? */}
      {step === 'continuity' && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-text text-center">
            契約期間と更新について
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleContinuity('yes_over_3months')}
              className="bg-card hover:bg-card-hover border border-border rounded-lg p-4 text-left transition-colors"
            >
              <div className="font-medium text-text">3ヶ月超 or 自動更新あり</div>
              <div className="text-xs text-text-muted mt-1">第7号文書（4,000円）</div>
            </button>
            <button
              type="button"
              onClick={() => handleContinuity('yes_under_3months_no_renewal')}
              className="bg-card hover:bg-card-hover border border-border rounded-lg p-4 text-left transition-colors"
            >
              <div className="font-medium text-text">3ヶ月以内で更新なし</div>
              <div className="text-xs text-text-muted mt-1">非課税</div>
            </button>
          </div>
          <button type="button" onClick={() => setStep('doc_type')} className="w-full text-sm text-text-muted hover:text-text py-2">
            ← 前の質問に戻る
          </button>
        </section>
      )}

      {/* Step2: 不動産が関係する? */}
      {step === 'real_estate' && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-text text-center">
            不動産（土地・建物）が関係しますか？
          </h2>
          <div className="space-y-2">
            {REAL_ESTATE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleRealEstate(opt.value)}
                className="w-full bg-card hover:bg-card-hover border border-border rounded-lg p-4 text-left transition-colors"
              >
                <div className="font-medium text-text">{opt.label}</div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => step === 'real_estate' && answers.docCategory === 'service' ? setStep('service_detail') : setStep('doc_type')}
            className="w-full text-sm text-text-muted hover:text-text py-2"
          >
            ← 前の質問に戻る
          </button>
        </section>
      )}

      {/* 領収書の営業判定 */}
      {step === 'receipt_business' && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-text text-center">
            営業に関する受取書ですか？
          </h2>
          <p className="text-sm text-text-muted text-center">
            個人の医師・弁護士・税理士等、公益法人、NPO法人の受取書は非課税です
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleReceiptBusiness(true)}
              className="bg-card hover:bg-card-hover border border-border rounded-lg p-4 text-left transition-colors"
            >
              <div className="font-medium text-text">はい（営業活動）</div>
              <div className="text-xs text-text-muted mt-1">
                会社・個人事業主としての売上
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleReceiptBusiness(false)}
              className="bg-card hover:bg-card-hover border border-border rounded-lg p-4 text-left transition-colors"
            >
              <div className="font-medium text-text">いいえ（非営業）</div>
              <div className="text-xs text-text-muted mt-1">
                個人の士業、公益法人、私的取引等
              </div>
            </button>
          </div>
          <button type="button" onClick={() => setStep('doc_type')} className="w-full text-sm text-text-muted hover:text-text py-2">
            ← 前の質問に戻る
          </button>
        </section>
      )}

      {/* 「その他・よくわからない」→ 取引の目的で絞り込み */}
      {step === 'other_purpose' && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-text text-center">
            この文書の目的は何ですか？
          </h2>
          <p className="text-sm text-text-muted text-center">
            取引の内容に近いものを選んでください
          </p>
          <div className="space-y-2">
            {([
              { category: 'sale_transfer' as DocCategory, label: '何かを売る・譲る', desc: '不動産、営業権、知的財産の売買・譲渡' },
              { category: 'service' as DocCategory, label: '仕事を頼む・引き受ける', desc: '業務委託、工事、制作、修理等' },
              { category: 'loan' as DocCategory, label: 'お金を貸す・借りる', desc: '金銭の貸借、借用証書' },
              { category: 'lease' as DocCategory, label: '場所を貸す・借りる', desc: '土地・建物の賃貸借' },
              { category: 'receipt' as DocCategory, label: 'お金を受け取った証拠を作る', desc: '領収書、受取書の発行' },
              { category: 'basic_agreement' as DocCategory, label: '継続取引のルールを決める', desc: '基本契約、取引条件の取り決め' },
            ]).map(opt => (
              <button
                key={opt.category}
                type="button"
                onClick={() => {
                  // docCategory を振り直して、対応するステップに遷移
                  updateAnswers({ docCategory: opt.category });
                  handleDocCategory(opt.category);
                }}
                className="w-full bg-card hover:bg-card-hover border border-border rounded-lg p-4 text-left transition-colors"
              >
                <div className="font-medium text-text">{opt.label}</div>
                <div className="text-xs text-text-muted mt-0.5">{opt.desc}</div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setStep('consult_expert'); window.scrollTo(0, 0); }}
              className="w-full bg-card hover:bg-card-hover border border-warning/30 rounded-lg p-4 text-left transition-colors"
            >
              <div className="font-medium text-warning">それでもわからない</div>
              <div className="text-xs text-text-muted mt-0.5">専門家への相談を案内します</div>
            </button>
          </div>
          <button type="button" onClick={() => setStep('doc_type')} className="w-full text-sm text-text-muted hover:text-text py-2">
            ← 前の質問に戻る
          </button>
        </section>
      )}

      {/* 専門家相談案内 */}
      {step === 'consult_expert' && (
        <section className="space-y-4">
          <div className="bg-card border-2 border-warning/30 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">📋</div>
            <h2 className="text-xl font-bold text-text mb-2">
              専門家にご相談ください
            </h2>
            <p className="text-sm text-text-muted leading-relaxed">
              文書の種類によって印紙税額が異なるため、正確な判定には文書の内容確認が必要です。
              お近くの税理士・行政書士、または管轄の税務署にご相談ください。
            </p>
            <div className="mt-4 bg-card-hover rounded-lg p-3 text-xs text-text-muted text-left space-y-1">
              <div className="font-bold text-text">💡 相談先の例</div>
              <p>• 税理士・行政書士（印紙税は行政書士の専門領域でもあります）</p>
              <p>• 管轄の税務署（無料で相談できます）</p>
              <p>• 国税庁の電話相談センター（0570-064-000）</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setStep('other_purpose'); window.scrollTo(0, 0); }}
            className="w-full text-sm text-text-muted hover:text-text py-2"
          >
            ← もう一度選び直す
          </button>
          <button type="button" onClick={onBack} className="w-full text-sm text-text-muted hover:text-text py-2">
            ← トップに戻る
          </button>
        </section>
      )}

      {/* Step3: 金額入力 */}
      {step === 'amount' && (
        <AmountStep
          showConsumptionTax={shouldShowConsumptionTax(answers)}
          onSubmit={handleAmountSubmit}
          onBack={() => {
            // 前のステップに戻る
            if (answers.docCategory === 'receipt') {
              setStep('receipt_business');
            } else if (answers.docCategory === 'loan' || answers.docCategory === 'bill_of_exchange') {
              setStep('doc_type');
            } else {
              setStep('real_estate');
            }
            window.scrollTo(0, 0);
          }}
        />
      )}
    </div>
  );
}

/**
 * 消費税の質問を表示すべきかを判定する。
 * 消費税が関係しない取引（土地のみの売買、金銭貸借、手形等）では非表示にする。
 */
function shouldShowConsumptionTax(answers: Partial<WizardAnswers>): boolean {
  // 土地のみの売買 → 消費税は非課税（消費税法第6条）
  if (answers.docCategory === 'sale_transfer' && answers.realEstate === 'land') {
    return false;
  }
  // 金銭貸借 → 利子は非課税、元本は消費税の対象外
  if (answers.docCategory === 'loan') {
    return false;
  }
  // 手形 → 消費税の区分記載は実質的に意味がない（通則で最小金額を採用するため）
  if (answers.docCategory === 'bill_of_exchange') {
    return false;
  }
  return true;
}

// ─── 金額入力サブコンポーネント ───

/** AmountStep から返す変更契約情報 */
interface AmendmentInfo {
  isAmendment: true;
  priorIdentifiable: boolean;
  amendmentDirection?: 'increase' | 'decrease';
  amendmentAmount?: number;
}

interface AmountStepProps {
  /** 消費税の記載方法の質問を表示するか */
  showConsumptionTax: boolean;
  onSubmit: (amount: number | null, taxNotation: TaxNotation, consumptionTaxAmount?: number, amendment?: AmendmentInfo) => void;
  onBack: () => void;
}

/** 数字文字列を3桁カンマ区切りにフォーマット */
function formatWithCommas(value: string): string {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString();
}

function AmountStep({ showConsumptionTax, onSubmit, onBack }: AmountStepProps) {
  const [amountStr, setAmountStr] = useState('');
  const [taxNotation, setTaxNotation] = useState<TaxNotation>('no_tax');
  const [taxAmountStr, setTaxAmountStr] = useState('');

  // 変更契約書の状態
  const [isAmendment, setIsAmendment] = useState(false);
  const [priorIdentifiable, setPriorIdentifiable] = useState<boolean | null>(null);
  const [amendDirection, setAmendDirection] = useState<'increase' | 'decrease' | null>(null);
  const [amendAmountStr, setAmendAmountStr] = useState('');

  const handleAmountChange = (value: string) => {
    setAmountStr(formatWithCommas(value));
  };

  const handleTaxAmountChange = (value: string) => {
    setTaxAmountStr(formatWithCommas(value));
  };

  const handleSubmit = () => {
    const amount = amountStr ? parseInt(amountStr.replace(/,/g, ''), 10) : null;
    const consumptionTaxAmount = taxAmountStr ? parseInt(taxAmountStr.replace(/,/g, ''), 10) : undefined;
    const amendment: AmendmentInfo | undefined = isAmendment ? {
      isAmendment: true,
      priorIdentifiable: priorIdentifiable === true,
      amendmentDirection: priorIdentifiable === true ? (amendDirection ?? undefined) : undefined,
      amendmentAmount: priorIdentifiable === true && amendDirection === 'increase' && amendAmountStr
        ? parseInt(amendAmountStr.replace(/,/g, ''), 10)
        : undefined,
    } : undefined;
    onSubmit(amount, taxNotation, consumptionTaxAmount, amendment);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-text text-center">
        金額を入力してください
      </h2>
      <p className="text-sm text-text-muted text-center">
        契約金額または受取金額（円）。不明な場合は空欄のまま進めます。
      </p>

      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        {/* 金額入力 */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            金額（円）
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={amountStr}
            onChange={e => handleAmountChange(e.target.value)}
            placeholder="例: 30,000,000"
            className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 消費税の記載方法（消費税が関係する取引の場合のみ表示） */}
        {showConsumptionTax ? (
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              消費税の記載方法
            </label>
            <div className="space-y-2">
              {([
                { value: 'no_tax' as TaxNotation, label: '消費税なし / 非課税取引', desc: '消費税が関係しない取引' },
                { value: 'tax_separated' as TaxNotation, label: '区分記載あり', desc: '「うち消費税○○円」と明記されている' },
                { value: 'tax_included_only' as TaxNotation, label: '税込金額のみ', desc: '消費税額が明記されていない' },
              ]).map(opt => (
                <label key={opt.value} className="flex items-start gap-3 p-3 rounded-lg hover:bg-card-hover cursor-pointer">
                  <input
                    type="radio"
                    name="taxNotation"
                    checked={taxNotation === opt.value}
                    onChange={() => setTaxNotation(opt.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium text-text">{opt.label}</div>
                    <div className="text-xs text-text-muted">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-text-muted bg-card-hover rounded-lg p-3">
            💡 この取引は消費税が非課税のため、入力された金額がそのまま記載金額になります
          </div>
        )}

        {/* 消費税額入力（区分記載の場合） */}
        {showConsumptionTax && taxNotation === 'tax_separated' && (
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              消費税額（円）
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={taxAmountStr}
              onChange={e => handleTaxAmountChange(e.target.value)}
              placeholder="例: 3,000,000"
              className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-text-muted mt-1">
              消費税額を除いた金額で印紙税を判定します
            </p>
          </div>
        )}
      </div>

      {/* 変更契約書チェック（オプション） */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isAmendment}
            onChange={e => {
              setIsAmendment(e.target.checked);
              if (!e.target.checked) {
                setPriorIdentifiable(null);
                setAmendDirection(null);
                setAmendAmountStr('');
              }
            }}
          />
          <div>
            <div className="text-sm font-medium text-text">これは変更契約書です</div>
            <div className="text-xs text-text-muted">金額変更の覚書・変更合意書など、既存契約の変更</div>
          </div>
        </label>

        {isAmendment && (
          <div className="mt-2 pl-6 space-y-3 border-l-2 border-border">
            {/* 変更前の特定可否 */}
            <div>
              <p className="text-sm font-medium text-text mb-2">
                元の契約書の番号や日付が、この変更書面に書かれていますか？
              </p>
              <p className="text-xs text-text-muted mb-2">
                例:「○年○月○日付 契約書第○号の金額を変更する」等の記載。
                「はい」の場合、増額分のみで印紙税を計算でき、税額が安くなることがあります。
              </p>
              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="priorIdentifiable"
                    checked={priorIdentifiable === true}
                    onChange={() => setPriorIdentifiable(true)}
                  />
                  <span className="text-sm text-text">はい（元の契約書の番号や日付が書かれている）</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="priorIdentifiable"
                    checked={priorIdentifiable === false}
                    onChange={() => { setPriorIdentifiable(false); setAmendDirection(null); setAmendAmountStr(''); }}
                  />
                  <span className="text-sm text-text">いいえ / わからない</span>
                </label>
              </div>
            </div>

            {/* 変更前不明の場合のガイド */}
            {priorIdentifiable === false && (
              <div className="text-xs text-text-muted bg-card-hover rounded-lg p-3">
                💡 上の金額欄に、この変更書面に書かれている金額を入力してください。元の契約書を特定する記載がないため、増額分のみでの計算（印紙税の減額）は適用されません。
              </div>
            )}

            {/* 増額/減額の選択（変更前特定可能の場合） */}
            {priorIdentifiable === true && (
              <div>
                <p className="text-sm font-medium text-text mb-2">金額はどう変わりましたか？</p>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="amendDirection"
                      checked={amendDirection === 'increase'}
                      onChange={() => setAmendDirection('increase')}
                    />
                    <span className="text-sm text-text">増額した</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="amendDirection"
                      checked={amendDirection === 'decrease'}
                      onChange={() => { setAmendDirection('decrease'); setAmendAmountStr(''); }}
                    />
                    <span className="text-sm text-text">減額した</span>
                  </label>
                </div>
              </div>
            )}

            {/* 増額分の金額入力 */}
            {priorIdentifiable === true && amendDirection === 'increase' && (
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  増額分の金額（円）
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amendAmountStr}
                  onChange={e => setAmendAmountStr(formatWithCommas(e.target.value))}
                  placeholder="例: 2,000,000"
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-text-muted mt-1">
                  💡 記載金額は増額分のみで計算されます（通則4 / No.7123）
                </p>
              </div>
            )}

            {/* 減額の案内 */}
            {priorIdentifiable === true && amendDirection === 'decrease' && (
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                <div className="text-sm font-bold text-accent-light">減額変更 → 記載金額なし</div>
                <p className="text-xs text-text-muted mt-1">
                  変更前の契約書が特定できる減額変更は、記載金額のない契約書として扱われます（印紙税200円）。上の金額欄の入力は不要です。
                </p>
                <p className="text-xs text-text-muted mt-1">
                  出典: 国税庁 No.7123
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="w-full bg-primary hover:bg-primary-dark text-white font-bold rounded-xl py-3 transition-colors"
      >
        判定する
      </button>
      <button type="button" onClick={onBack} className="w-full text-sm text-text-muted hover:text-text py-2">
        ← 前の質問に戻る
      </button>
    </section>
  );
}
