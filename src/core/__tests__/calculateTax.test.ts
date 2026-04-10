/**
 * 一次検証テスト: 国税庁タックスアンサーの計算例と照合
 *
 * 出典URLは各テストケースのコメントに記載。
 * verify-with-examples skill の Step 5 に従い、検証済み実例をテストとして固定化。
 */

import { describe, test, expect } from 'vitest';
import { calculateTax } from '../calculateTax';
import { classifyDocument } from '../classifyDocument';
import type { WizardAnswers } from '../types';

// ============================================================
// A. 基本パターン: 各号の税額テーブル照合
// 出典: https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7140.htm
//       https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7141.htm
// ============================================================

describe('税額テーブル照合（国税庁 No.7140/7141）', () => {
  // 第1号: 不動産譲渡契約書
  test('第1号の1: 不動産売買 3,000万円 → 通常20,000円', () => {
    const result = calculateTax('1-1', 30_000_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(20_000);
  });

  test('第1号の1: 不動産売買 9,000円 → 非課税（1万円未満）', () => {
    const result = calculateTax('1-1', 9_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(0);
  });

  test('第1号の1: 記載金額なし → 200円', () => {
    const result = calculateTax('1-1', null, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(200);
  });

  // 第2号: 請負契約書
  test('第2号: 請負 500万円 → 2,000円', () => {
    const result = calculateTax('2', 5_000_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(2_000);
  });

  // 第3号: 手形
  test('第3号: 約束手形 500万円 → 1,000円（500万円以下）', () => {
    const result = calculateTax('3', 5_000_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(1_000);
  });

  test('第3号: 手形 9万円 → 非課税（10万円未満）', () => {
    const result = calculateTax('3', 90_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(0);
  });

  test('第3号: 記載金額なし → 非課税', () => {
    const result = calculateTax('3', null, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(0);
  });

  // 第17号の1: 領収書
  test('第17号の1: 領収書 48,000円 → 非課税（5万円未満）', () => {
    const result = calculateTax('17-1', 48_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(0);
  });

  test('第17号の1: 領収書 50,000円 → 200円', () => {
    const result = calculateTax('17-1', 50_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(200);
  });

  test('第17号の1: 領収書 500万円 → 1,000円（500万円以下）', () => {
    const result = calculateTax('17-1', 5_000_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(1_000);
  });

  // 第15号: 債権譲渡
  test('第15号: 債権譲渡 5,000円 → 非課税（1万円未満）', () => {
    const result = calculateTax('15', 5_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(0);
  });

  test('第15号: 債権譲渡 10,000円 → 200円', () => {
    const result = calculateTax('15', 10_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(200);
  });
});

// ============================================================
// B. 軽減措置
// 出典: https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7108.htm
// ============================================================

describe('軽減措置（国税庁 No.7108）', () => {
  test('不動産譲渡 3,000万円 → 軽減10,000円（通常20,000円）', () => {
    const result = calculateTax('1-1', 30_000_000, {
      taxNotation: 'no_tax', isReduction: true,
    });
    expect(result.taxAmount).toBe(10_000);
    expect(result.isReduction).toBe(true);
    expect(result.reductionSaving).toBe(10_000);
  });

  test('建設工事請負 5,000万円 → 軽減10,000円（通常20,000円）', () => {
    const result = calculateTax('2', 50_000_000, {
      taxNotation: 'no_tax', isReduction: true,
    });
    expect(result.taxAmount).toBe(10_000);
    expect(result.isReduction).toBe(true);
    expect(result.reductionSaving).toBe(10_000);
  });

  test('建設工事請負 300万円 → 軽減500円（通常1,000円）', () => {
    const result = calculateTax('2', 3_000_000, {
      taxNotation: 'no_tax', isReduction: true,
    });
    expect(result.taxAmount).toBe(500);
    expect(result.reductionSaving).toBe(500);
  });
});

// ============================================================
// C. 消費税の区分記載
// 出典: https://www.nta.go.jp/law/shitsugi/inshi/06/01.htm
// ============================================================

describe('消費税の区分記載', () => {
  test('請負 税込1,100万円（消費税100万円）→ 税抜1,000万円で判定 → 10,000円', () => {
    const result = calculateTax('2', 11_000_000, {
      taxNotation: 'tax_separated',
      consumptionTaxAmount: 1_000_000,
      isReduction: false,
    });
    expect(result.taxAmount).toBe(10_000);
    expect(result.consumptionTaxNote).toContain('1,000,000');
  });

  test('領収書 税込52,800円（消費税4,800円）→ 税抜48,000円 → 非課税', () => {
    const result = calculateTax('17-1', 52_800, {
      taxNotation: 'tax_separated',
      consumptionTaxAmount: 4_800,
      isReduction: false,
    });
    expect(result.taxAmount).toBe(0);
  });
});

// ============================================================
// D. 第3号手形の特例
// 出典: https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7140.htm
// ============================================================

describe('第3号手形の特例', () => {
  test('一覧払手形 50万円 → 一律200円', () => {
    const result = calculateTax('3', 500_000, {
      taxNotation: 'no_tax', isReduction: false, isSpecialBill: true,
    });
    expect(result.taxAmount).toBe(200);
  });

  test('一覧払手形 9万円 → 非課税（10万円未満）', () => {
    const result = calculateTax('3', 90_000, {
      taxNotation: 'no_tax', isReduction: false, isSpecialBill: true,
    });
    expect(result.taxAmount).toBe(0);
  });
});

// ============================================================
// E. 文書分類（classifyDocument）
// ============================================================

describe('文書分類', () => {
  test('委任契約 → 不課税', () => {
    const answers: WizardAnswers = { docCategory: 'service', isUkeoi: false };
    const result = classifyDocument(answers);
    expect(result.type).toBe('non_taxable');
  });

  test('建物賃貸借 → 不課税', () => {
    const answers: WizardAnswers = { docCategory: 'lease', realEstate: 'building' };
    const result = classifyDocument(answers);
    expect(result.type).toBe('non_taxable');
  });

  test('動産売買 → 不課税', () => {
    const answers: WizardAnswers = { docCategory: 'sale_transfer', realEstate: 'none' };
    const result = classifyDocument(answers);
    expect(result.type).toBe('non_taxable');
  });

  test('不動産売買 → 第1号の1（課税）', () => {
    const answers: WizardAnswers = { docCategory: 'sale_transfer', realEstate: 'land' };
    const result = classifyDocument(answers);
    expect(result.type).toBe('taxable');
    if (result.type === 'taxable') {
      expect(result.classNumber).toBe('1-1');
      expect(result.isReduction).toBe(true);
    }
  });

  test('工事請負 → 第2号（課税、軽減対象）', () => {
    const answers: WizardAnswers = { docCategory: 'construction', realEstate: 'building' };
    const result = classifyDocument(answers);
    expect(result.type).toBe('taxable');
    if (result.type === 'taxable') {
      expect(result.classNumber).toBe('2');
      expect(result.isReduction).toBe(true);
    }
  });

  test('領収書（営業に関しない）→ 不課税', () => {
    const answers: WizardAnswers = { docCategory: 'receipt', isBusinessActivity: false };
    const result = classifyDocument(answers);
    expect(result.type).toBe('non_taxable');
  });

  test('領収書（営業）→ 第17号の1（課税）', () => {
    const answers: WizardAnswers = { docCategory: 'receipt', isBusinessActivity: true };
    const result = classifyDocument(answers);
    expect(result.type).toBe('taxable');
    if (result.type === 'taxable') {
      expect(result.classNumber).toBe('17-1');
    }
  });

  test('会社設立 → 定額（第5号 40,000円）', () => {
    const answers: WizardAnswers = { docCategory: 'corporate' };
    const result = classifyDocument(answers);
    expect(result.type).toBe('fixed');
    if (result.type === 'fixed') {
      expect(result.fixedAmount).toBe(40_000);
    }
  });

  test('取引基本契約（3ヶ月超）→ 定額（第7号 4,000円）', () => {
    const answers: WizardAnswers = { docCategory: 'basic_agreement', continuity: 'yes_over_3months' };
    const result = classifyDocument(answers);
    expect(result.type).toBe('fixed');
    if (result.type === 'fixed') {
      expect(result.fixedAmount).toBe(4_000);
    }
  });

  test('取引基本契約（3ヶ月以内+更新なし）→ 非課税', () => {
    const answers: WizardAnswers = { docCategory: 'basic_agreement', continuity: 'yes_under_3months_no_renewal' };
    const result = classifyDocument(answers);
    expect(result.type).toBe('non_taxable');
  });
});
