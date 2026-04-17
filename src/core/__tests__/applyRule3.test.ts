/**
 * 通則3エンジンの検証テスト
 *
 * 出典: 印紙税法 別表第一 通則3 / 国税庁 印紙税法基本通達 第11〜14条
 */

import { describe, test, expect } from 'vitest';
import { applyRule3 } from '../applyRule3';
import { classifyDocument } from '../classifyDocument';
import type { WizardAnswers } from '../types';

describe('通則3イ: 第1号/第2号 vs 第3〜17号', () => {
  test('売買(1-1) + 請負(2) → 1-1（ロ適用）', () => {
    const result = applyRule3({ primary: '1-1', additions: ['2'], amount: 30_000_000 });
    expect(result.finalClass).toBe('1-1');
    expect(result.changed).toBe(false);
  });

  test('請負(2) primary + 売買(1-1) 追加 → 1-1（primary変更）', () => {
    const result = applyRule3({ primary: '2', additions: ['1-1'], amount: 30_000_000 });
    expect(result.finalClass).toBe('1-1');
    expect(result.changed).toBe(true);
    expect(result.appliedRule).toContain('通則3');
  });

  test('売買(1-1) + 基本契約(7) 金額記載あり → 1-1維持', () => {
    const result = applyRule3({ primary: '1-1', additions: ['7'], amount: 5_000_000 });
    expect(result.finalClass).toBe('1-1');
  });

  test('売買(1-1) + 基本契約(7) 金額記載なし → 7へ昇格', () => {
    const result = applyRule3({ primary: '1-1', additions: ['7'], amount: null });
    expect(result.finalClass).toBe('7');
    expect(result.changed).toBe(true);
    expect(result.appliedRule).toContain('例外');
  });

  test('請負(2) + 基本契約(7) 金額記載あり → 2維持', () => {
    const result = applyRule3({ primary: '2', additions: ['7'], amount: 2_000_000 });
    expect(result.finalClass).toBe('2');
  });

  test('請負(2) + 基本契約(7) 金額記載なし → 7へ昇格', () => {
    const result = applyRule3({ primary: '2', additions: ['7'], amount: null });
    expect(result.finalClass).toBe('7');
    expect(result.appliedRule).toContain('例外');
  });

  test('売買(1-1) + 領収書(17-1) 金額記載なし → 17-1へ（売上代金受取想定）', () => {
    const result = applyRule3({ primary: '1-1', additions: ['17-1'], amount: null });
    expect(result.finalClass).toBe('17-1');
    expect(result.appliedRule).toContain('例外');
  });

  test('売買(1-1) + 領収書(17-1) 金額記載あり → 1-1維持（保守的判定）', () => {
    const result = applyRule3({ primary: '1-1', additions: ['17-1'], amount: 5_000_000 });
    expect(result.finalClass).toBe('1-1');
  });
});

describe('通則3ロ: 第1号 vs 第2号（原則）', () => {
  test('1-1 + 2 同時該当（3〜17号なし）→ 1-1優先', () => {
    const result = applyRule3({ primary: '2', additions: ['1-1'], amount: 10_000_000 });
    expect(result.finalClass).toBe('1-1');
    expect(result.changed).toBe(true);
  });
});

describe('通則3ロ: 金額区分の例外', () => {
  test('1-1 + 2、金額区分なし → 1-1（原則維持）', () => {
    const result = applyRule3({ primary: '1-1', additions: ['2'], amount: 8_000_000 });
    expect(result.finalClass).toBe('1-1');
    expect(result.appliedRule).toBe('通則3ロ');
  });

  test('1-1 + 2、金額区分あり、1号 > 2号 → 1-1（原則維持）', () => {
    const result = applyRule3({
      primary: '1-1',
      additions: ['2'],
      amount: 8_000_000,
      amountByClass: { '1-1': 5_000_000, '2': 3_000_000 },
    });
    expect(result.finalClass).toBe('1-1');
    expect(result.appliedRule).toBe('通則3ロ');
  });

  test('1-1 + 2、金額区分あり、2号 > 1号 → 2（例外発動）', () => {
    const result = applyRule3({
      primary: '1-1',
      additions: ['2'],
      amount: 8_000_000,
      amountByClass: { '1-1': 3_000_000, '2': 5_000_000 },
    });
    expect(result.finalClass).toBe('2');
    expect(result.changed).toBe(true);
    expect(result.appliedRule).toContain('例外');
    expect(result.explanation).toContain('5,000,000');
  });

  test('2 + 1-1、金額区分あり、2号 > 1号 → 2（当初号維持）', () => {
    const result = applyRule3({
      primary: '2',
      additions: ['1-1'],
      amount: 8_000_000,
      amountByClass: { '1-1': 3_000_000, '2': 5_000_000 },
    });
    expect(result.finalClass).toBe('2');
    expect(result.changed).toBe(false);
  });

  test('1-1 + 2、金額区分あり、同額 → 1-1（原則: 超えない限り1号優先）', () => {
    const result = applyRule3({
      primary: '1-1',
      additions: ['2'],
      amount: 6_000_000,
      amountByClass: { '1-1': 3_000_000, '2': 3_000_000 },
    });
    expect(result.finalClass).toBe('1-1');
  });

  test('1-1 + 2 + 7、金額区分あり、2号 > 1号 → 2（イ+ロの例外複合）', () => {
    const result = applyRule3({
      primary: '1-1',
      additions: ['2', '7'],
      amount: 8_000_000,
      amountByClass: { '1-1': 3_000_000, '2': 5_000_000 },
    });
    expect(result.finalClass).toBe('2');
    expect(result.appliedRule).toContain('例外');
  });
});

describe('通則3ハ: 第3〜17号同士', () => {
  test('基本契約(7) + 領収書(17-1) 金額100万円以下 → 7優先（号数小）', () => {
    const result = applyRule3({ primary: '17-1', additions: ['7'], amount: 500_000 });
    expect(result.finalClass).toBe('7');
    expect(result.appliedRule).toBe('通則3ハ');
  });

  test('基本契約(7) + 領収書(17-1) 売上代金100万円超 → 17-1へ', () => {
    const result = applyRule3({ primary: '7', additions: ['17-1'], amount: 2_000_000 });
    expect(result.finalClass).toBe('17-1');
    expect(result.appliedRule).toContain('例外');
  });
});

describe('単一号（追加選択なし）', () => {
  test('追加なし → 変更なし', () => {
    const result = applyRule3({ primary: '1-1', additions: [], amount: 1_000_000 });
    expect(result.finalClass).toBe('1-1');
    expect(result.changed).toBe(false);
    expect(result.appliedRule).toBe('none');
  });

  test('重複のみ → 変更なし', () => {
    const result = applyRule3({ primary: '2', additions: ['2'], amount: 1_000_000 });
    expect(result.finalClass).toBe('2');
    expect(result.changed).toBe(false);
  });
});

describe('classifyDocument で hybridOptions が付与される', () => {
  test('不動産売買 → 第1号の1 に hybridOptions 3件', () => {
    const answers: WizardAnswers = { docCategory: 'sale_transfer', realEstate: 'land' };
    const result = classifyDocument(answers);
    expect(result.type).toBe('taxable');
    if (result.type === 'taxable') {
      expect(result.classNumber).toBe('1-1');
      expect(result.hybridOptions).toBeDefined();
      expect(result.hybridOptions!.length).toBe(3);
    }
  });

  test('建設工事請負 → 第2号 に hybridOptions 2件', () => {
    const answers: WizardAnswers = { docCategory: 'construction', realEstate: 'building' };
    const result = classifyDocument(answers);
    expect(result.type).toBe('taxable');
    if (result.type === 'taxable') {
      expect(result.classNumber).toBe('2');
      expect(result.hybridOptions!.length).toBe(2);
    }
  });

  test('基本契約（3ヶ月超）→ 第7号 FixedResult に hybridOptions 2件', () => {
    const answers: WizardAnswers = { docCategory: 'basic_agreement', continuity: 'yes_over_3months' };
    const result = classifyDocument(answers);
    expect(result.type).toBe('fixed');
    if (result.type === 'fixed') {
      expect(result.classNumber).toBe('7');
      expect(result.hybridOptions!.length).toBe(2);
    }
  });

  test('領収書（営業）→ 第17号の1 に hybridOptions 2件', () => {
    const answers: WizardAnswers = { docCategory: 'receipt', isBusinessActivity: true };
    const result = classifyDocument(answers);
    expect(result.type).toBe('taxable');
    if (result.type === 'taxable') {
      expect(result.classNumber).toBe('17-1');
      expect(result.hybridOptions!.length).toBe(2);
    }
  });

  test('金銭貸借(1-3) → hybridOptions なし（リスクなし扱い）', () => {
    const answers: WizardAnswers = { docCategory: 'loan' };
    const result = classifyDocument(answers);
    expect(result.type).toBe('taxable');
    if (result.type === 'taxable') {
      expect(result.classNumber).toBe('1-3');
      expect(result.hybridOptions).toBeUndefined();
    }
  });
});
