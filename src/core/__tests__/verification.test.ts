/**
 * 二次検証テスト: 税理士・法律事務所・会計ソフトの判定事例と照合
 *
 * verify-with-examples skill の Step 3〜5 に従い、
 * 実世界の判定事例を自作ロジックで再計算して一致を確認。
 * 検証済み事例はリグレッション検出用テストとして固定化。
 */

import { describe, test, expect } from 'vitest';
import { calculateTax } from '../calculateTax';
import { classifyDocument } from '../classifyDocument';
import type { WizardAnswers } from '../types';

// ============================================================
// A. 基本的な税額計算
// ============================================================

describe('二次検証: 基本税額', () => {
  // 事例1: クラウドサイン https://www.cloudsign.jp/media/ukeoi-syunyu/
  test('事例1: 請負契約書 250万円 → 1,000円', () => {
    const result = calculateTax('2', 2_500_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(1_000);
  });

  // 事例2: 国税庁 No.7124
  // https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7124.htm
  test('事例2: 請負 1,000万円（消費税100万円区分記載）→ 税抜900万円で判定? → 実は10,000円', () => {
    // 注意: 「契約金額1,000万円」で「うち消費税100万円」の場合、
    // 記載金額は税抜900万円。900万円は「500万円超〜1,000万円以下」→ 10,000円
    const result = calculateTax('2', 10_000_000, {
      taxNotation: 'tax_separated',
      consumptionTaxAmount: 1_000_000,
      isReduction: false,
    });
    expect(result.taxAmount).toBe(10_000);
  });
});

// ============================================================
// B. 軽減措置
// ============================================================

describe('二次検証: 軽減措置', () => {
  // 事例3: 国税庁 No.7108
  test('事例3: 不動産譲渡 6,000万円（建物4000万+借地権2000万）→ 軽減30,000円', () => {
    const result = calculateTax('1-1', 60_000_000, {
      taxNotation: 'no_tax', isReduction: true,
    });
    expect(result.taxAmount).toBe(30_000);
  });

  // 事例4: 国税庁 No.7108
  test('事例4: 建設工事請負 5,500万円（工事5000万+設計500万）→ 軽減30,000円', () => {
    const result = calculateTax('2', 55_000_000, {
      taxNotation: 'no_tax', isReduction: true,
    });
    expect(result.taxAmount).toBe(30_000);
  });
});

// ============================================================
// C. 消費税の区分記載
// ============================================================

describe('二次検証: 消費税区分記載', () => {
  // 事例5: 国税庁 No.7124 — 税額不明示（税込のみ）
  test('事例5: 請負「1,100万円（税込）」税額不明示 → 1,100万円で判定 → 20,000円', () => {
    const result = calculateTax('2', 11_000_000, {
      taxNotation: 'tax_included_only',
      isReduction: false,
    });
    expect(result.taxAmount).toBe(20_000);
  });

  // 事例6: 国税庁 No.7124 — 区分記載あり
  test('事例6: 領収書「代金48,000円、消費税4,800円、合計52,800円」→ 48,000円で判定 → 非課税', () => {
    const result = calculateTax('17-1', 52_800, {
      taxNotation: 'tax_separated',
      consumptionTaxAmount: 4_800,
      isReduction: false,
    });
    expect(result.taxAmount).toBe(0);
  });
});

// ============================================================
// D. 境界値
// ============================================================

describe('二次検証: 境界値', () => {
  // 事例7: freee https://www.freee.co.jp/kb/kb-invoice/receipt-revenue-stamp/
  test('事例7: 領収書 50,000円ちょうど → 200円（5万円以上）', () => {
    const result = calculateTax('17-1', 50_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(200);
  });

  // 事例8: 国税庁 No.7124 — 区分記載で境界値を下回る
  test('事例8: 領収書 税込52,800円、税抜48,000円（区分記載）→ 非課税', () => {
    const result = calculateTax('17-1', 52_800, {
      taxNotation: 'tax_separated',
      consumptionTaxAmount: 4_800,
      isReduction: false,
    });
    expect(result.taxAmount).toBe(0);
  });

  // 追加: 49,999円 → 非課税、50,000円 → 200円 の境界
  test('境界: 領収書 49,999円 → 非課税', () => {
    const result = calculateTax('17-1', 49_999, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(0);
  });

  // 追加: 第1号の1万円境界
  test('境界: 不動産売買 10,000円 → 200円（1万円以上）', () => {
    const result = calculateTax('1-1', 10_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(200);
  });

  test('境界: 不動産売買 9,999円 → 非課税（1万円未満）', () => {
    const result = calculateTax('1-1', 9_999, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(0);
  });
});

// ============================================================
// E. 不課税文書の判定
// ============================================================

describe('二次検証: 不課税文書', () => {
  // 事例9: T&A税理士法人 https://tax-help.jp/topics/2016/12/post-39.html
  test('事例9: 建物賃貸借契約書 → 不課税', () => {
    const answers: WizardAnswers = { docCategory: 'lease', realEstate: 'building' };
    const result = classifyDocument(answers);
    expect(result.type).toBe('non_taxable');
  });

  // 事例10: T&A税理士法人 — 労働者派遣契約書
  // 労働者派遣は委任に近いため不課税
  test('事例10: 業務委託（委任）→ 不課税', () => {
    const answers: WizardAnswers = { docCategory: 'service', isUkeoi: false };
    const result = classifyDocument(answers);
    expect(result.type).toBe('non_taxable');
  });
});

// ============================================================
// F. 営業に関しない受取書
// ============================================================

describe('二次検証: 営業に関しない受取書', () => {
  // 事例11: 国税庁 No.7105
  test('事例11: 個人（非商人）の領収書 10万円 → 不課税', () => {
    const answers: WizardAnswers = { docCategory: 'receipt', isBusinessActivity: false };
    const result = classifyDocument(answers);
    expect(result.type).toBe('non_taxable');
  });
});

// ============================================================
// G. 複数号該当
// ============================================================

describe('二次検証: 複数号該当', () => {
  // 事例12: BUSINESS LAWYERS — 請負と委任の混合
  // 請負部分があれば第2号として課税
  test('事例12: 業務委託（請負）→ 第2号として課税', () => {
    const answers: WizardAnswers = { docCategory: 'service', isUkeoi: true, realEstate: 'none' };
    const result = classifyDocument(answers);
    expect(result.type).toBe('taxable');
    if (result.type === 'taxable') {
      expect(result.classNumber).toBe('2');
    }
  });
});

// ============================================================
// H. 変更契約書の記載金額
// ============================================================

describe('二次検証: 変更契約書', () => {
  // 事例13: クラウドサイン — 増額変更
  // 原契約2億円 → 2億2,000万円。記載金額は増額分2,000万円
  // 2,000万円 = 第2号「1,000万円超〜5,000万円以下」→ 20,000円
  // (二次情報の記事が10,000円としていたのは号の前提が異なっていた可能性。NTA税額表で検証済み)
  test('事例13: 変更契約（増額2,000万円）→ 20,000円', () => {
    const result = calculateTax('2', 20_000_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(20_000);
  });

  // 事例14: クラウドサイン — 減額変更
  // 原契約2億円 → 2,000万円減額。記載金額なし
  test('事例14: 変更契約（減額）→ 記載金額なし → 200円', () => {
    const result = calculateTax('2', null, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(200);
  });

  // 事例15: クラウドサイン — 原契約書なし（口頭合意のみ）
  // 変更後全額が記載金額。2億2,000万円
  // 第2号: 1億円超〜5億円以下 → 100,000円
  // (二次情報が60,000円としていたのは第1号(不動産)の軽減措置適用を前提にしていた可能性。
  //  第2号(請負)なら100,000円が正しい。NTA税額表で検証済み)
  test('事例15: 変更契約（原契約なし、第2号、2億2,000万円）→ 100,000円', () => {
    const result = calculateTax('2', 220_000_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(100_000);
  });

  // 事例15b: 同じケースを第1号の1（不動産譲渡、軽減適用）で検算 → 60,000円
  test('事例15b: 変更契約（原契約なし、第1号の1 軽減、2億2,000万円）→ 60,000円', () => {
    const result = calculateTax('1-1', 220_000_000, {
      taxNotation: 'no_tax', isReduction: true,
    });
    expect(result.taxAmount).toBe(60_000);
  });
});

// ============================================================
// 補完: 異常系・極端値
// ============================================================

describe('異常系・極端値', () => {
  test('0円入力 → 非課税', () => {
    const result = calculateTax('17-1', 0, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(0);
  });

  test('100億円超の不動産売買 → 600,000円（最大税額）', () => {
    const result = calculateTax('1-1', 100_000_000_000, {
      taxNotation: 'no_tax', isReduction: false,
    });
    expect(result.taxAmount).toBe(600_000);
  });

  test('100億円超の不動産売買（軽減）→ 480,000円', () => {
    const result = calculateTax('1-1', 100_000_000_000, {
      taxNotation: 'no_tax', isReduction: true,
    });
    expect(result.taxAmount).toBe(480_000);
  });
});
