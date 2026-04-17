import { useCallback, useState } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { FeedbackSection } from './components/shared/FeedbackSection';
import { SeoExpandableSections } from './components/sections/SeoExpandableSections';
import { EntryScreen } from './components/EntryScreen';
import { TaxTableScreen } from './components/TaxTableScreen';
import { StampDutyWizard } from './components/wizard/StampDutyWizard';
import { ResultScreen } from './components/ResultScreen';
import { classifyDocument } from './core/classifyDocument';
import { calculateTax, adjustAmendmentAmount } from './core/calculateTax';
import type { WizardAnswers, ClassificationResult, TaxResult } from './core/types';

type Screen = 'entry' | 'table' | 'wizard' | 'result';

export default function App() {
  const [screen, setScreen] = useState<Screen>('entry');
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [taxResult, setTaxResult] = useState<TaxResult | null>(null);
  const [wizardAnswers, setWizardAnswers] = useState<WizardAnswers | null>(null);

  const goHome = useCallback(() => {
    setScreen('entry');
    setClassification(null);
    setTaxResult(null);
    setWizardAnswers(null);
    window.scrollTo(0, 0);
  }, []);

  const goTable = useCallback(() => {
    setScreen('table');
    window.scrollTo(0, 0);
  }, []);

  const goWizard = useCallback(() => {
    setScreen('wizard');
    setClassification(null);
    setTaxResult(null);
    setWizardAnswers(null);
    window.scrollTo(0, 0);
  }, []);

  const handleWizardComplete = useCallback((answers: WizardAnswers) => {
    setWizardAnswers(answers);
    const cls = classifyDocument(answers);
    setClassification(cls);

    // 変更契約書の記載金額調整（通則4 / No.7123）
    const effectiveAmount = adjustAmendmentAmount(
      answers.amount ?? null,
      answers.isAmendment,
      answers.priorIdentifiable,
      answers.amendmentDirection,
      answers.amendmentAmount,
    );

    if (cls.type === 'taxable') {
      const result = calculateTax(cls.classNumber, effectiveAmount, {
        taxNotation: answers.taxNotation ?? 'no_tax',
        consumptionTaxAmount: answers.consumptionTaxAmount,
        isReduction: cls.isReduction,
        isSpecialBill: answers.isSpecialBill,
      });
      setTaxResult(result);
    } else if (cls.type === 'fixed') {
      setTaxResult({
        taxAmount: cls.fixedAmount,
        classNumber: cls.classNumber,
        classLabel: cls.label,
        isReduction: false,
        reductionSaving: null,
        legalBasis: [`第${cls.classNumber}号文書: 一律${cls.fixedAmount.toLocaleString()}円`],
        warnings: [
          '印紙を貼り付けなかった場合、本来の印紙税額の3倍の過怠税が課されます（自己申告の場合は1.1倍）',
        ],
        consumptionTaxNote: null,
      });
    } else {
      setTaxResult(null);
    }

    setScreen('result');
    window.scrollTo(0, 0);
  }, []);

  /** 早見表から号を選んで金額入力後に呼ばれる */
  const handleTableSelect = useCallback((classNumber: string, amount: number | null, isReduction: boolean) => {
    const result = calculateTax(classNumber, amount, {
      taxNotation: 'no_tax',
      isReduction,
    });
    const major = parseInt(classNumber.split('-')[0], 10);
    const source = isReduction
      ? 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7108.htm'
      : major <= 4
        ? 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7140.htm'
        : 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7141.htm';
    setClassification({ type: 'taxable', classNumber, label: result.classLabel, isReduction, source });
    setTaxResult(result);
    setScreen('result');
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Header onHomeClick={goHome} />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6">
          {screen === 'entry' && (
            <EntryScreen onGoTable={goTable} onGoWizard={goWizard} />
          )}

          {screen === 'table' && (
            <TaxTableScreen onSelect={handleTableSelect} onBack={goHome} />
          )}

          {screen === 'wizard' && (
            <StampDutyWizard onComplete={handleWizardComplete} onBack={goHome} />
          )}

          {screen === 'result' && (
            <ResultScreen
              classification={classification}
              taxResult={taxResult}
              wizardAnswers={wizardAnswers}
              onBack={goHome}
              onRetry={goWizard}
            />
          )}

          {screen === 'entry' && <FeedbackSection />}
          {screen === 'entry' && <SeoExpandableSections />}
        </div>
      </main>

      <Footer />
    </div>
  );
}
