/**
 * 税額計算ロジック
 *
 * 号番号 + 金額 → 印紙税額を計算する。
 * data.ts の taxBrackets / reductionBrackets を検索して税額を返す。
 */

import {
  DOCUMENT_CLASSES,
  SPECIAL_BILL_OF_EXCHANGE,
  STAMP_DUTY_META,
  type TaxBracket,
} from '../data/sources/nta-inshizei/data';
import type { LegalBasisEntry, TaxNotation, TaxResult } from './types';

interface CalculateOptions {
  taxNotation: TaxNotation;
  consumptionTaxAmount?: number;
  isReduction: boolean;
  isSpecialBill?: boolean;
}

/**
 * 号番号と金額から印紙税額を計算する。
 *
 * @param classNumber - 号番号（"1-1", "2", "17-1" 等）
 * @param rawAmount - 記載金額（円）。null = 記載金額なし
 * @param options - 消費税・軽減措置・手形特例のオプション
 */
export function calculateTax(
  classNumber: string,
  rawAmount: number | null,
  options: CalculateOptions,
): TaxResult {
  const cls = DOCUMENT_CLASSES.find(d => d.number === classNumber);
  if (!cls) {
    throw new Error(`Unknown class number: ${classNumber}`);
  }

  const warnings: string[] = [];
  const legalBasis: LegalBasisEntry[] = [];
  let consumptionTaxNote: string | null = null;

  // ──────────────────────────────────────
  // 1. 消費税の調整
  // ──────────────────────────────────────
  let amount = rawAmount;
  if (amount !== null && options.taxNotation === 'tax_separated' && options.consumptionTaxAmount) {
    amount = amount - options.consumptionTaxAmount;
    consumptionTaxNote = `消費税${options.consumptionTaxAmount.toLocaleString()}円を除いた${amount.toLocaleString()}円で判定しました`;
    legalBasis.push({ law: '印紙税法基本通達', description: '消費税額等が区分記載されている場合は、消費税額等を除いた金額が記載金額' });
  }

  // ──────────────────────────────────────
  // 2. 定額・年額の場合
  // ──────────────────────────────────────
  if (cls.taxType === 'fixed' && cls.fixedAmount !== undefined) {
    return {
      taxAmount: cls.fixedAmount,
      classNumber,
      classLabel: cls.label,
      isReduction: false,
      reductionSaving: null,
      legalBasis: [{ law: '印紙税法 別表第一', description: `第${formatClassNumber(classNumber)}号文書: 一律${cls.fixedAmount.toLocaleString()}円` }],
      warnings: buildWarnings(warnings),
      consumptionTaxNote,
    };
  }

  if (cls.taxType === 'annual' && cls.annualAmount !== undefined) {
    return {
      taxAmount: cls.annualAmount,
      classNumber,
      classLabel: cls.label,
      isReduction: false,
      reductionSaving: null,
      legalBasis: [{ law: '印紙税法 別表第一', description: `第${formatClassNumber(classNumber)}号文書: 1年につき${cls.annualAmount.toLocaleString()}円` }],
      warnings: buildWarnings(warnings),
      consumptionTaxNote,
    };
  }

  // ──────────────────────────────────────
  // 3. 記載金額なしの場合
  // ──────────────────────────────────────
  if (amount === null || amount === undefined) {
    const noAmountTax = cls.noAmountTax;
    return {
      taxAmount: noAmountTax ?? 0,
      classNumber,
      classLabel: cls.label,
      isReduction: false,
      reductionSaving: null,
      legalBasis: [
        {
          law: '印紙税法 別表第一',
          description: noAmountTax !== null
            ? `記載金額のない第${formatClassNumber(classNumber)}号文書: ${noAmountTax.toLocaleString()}円`
            : `記載金額のない第${formatClassNumber(classNumber)}号文書: 非課税`,
        },
      ],
      warnings: buildWarnings(warnings),
      consumptionTaxNote,
    };
  }

  // ──────────────────────────────────────
  // 4. 第3号手形の特例チェック
  // ──────────────────────────────────────
  if (classNumber === '3' && options.isSpecialBill) {
    const taxAmount = lookupBracket(SPECIAL_BILL_OF_EXCHANGE.taxBrackets as readonly TaxBracket[], amount);
    return {
      taxAmount,
      classNumber,
      classLabel: cls.label,
      isReduction: false,
      reductionSaving: null,
      legalBasis: [{ law: '印紙税法 別表第一', description: `第3号文書（特例手形）: ${taxAmount === 0 ? '非課税（10万円未満）' : '一律200円'}` }],
      warnings: buildWarnings(warnings),
      consumptionTaxNote,
    };
  }

  // ──────────────────────────────────────
  // 5. 通常の階段税率 or 軽減措置
  // ──────────────────────────────────────
  const brackets = cls.taxBrackets;
  if (!brackets) {
    throw new Error(`No tax brackets for class ${classNumber}`);
  }

  const normalTax = lookupBracket(brackets, amount);
  let taxAmount = normalTax;
  let isReduction = false;
  let reductionSaving: number | null = null;

  // 軽減措置の適用
  if (options.isReduction && cls.reductionBrackets) {
    const reductionTax = lookupBracket(cls.reductionBrackets, amount);
    // 軽減措置は通常税額より低い場合のみ適用（安全チェック）
    if (reductionTax < normalTax) {
      taxAmount = reductionTax;
      isReduction = true;
      reductionSaving = normalTax - reductionTax;
      legalBasis.push({
        law: '租税特別措置法第91条の4',
        description: `軽減措置適用: ${normalTax.toLocaleString()}円 → ${reductionTax.toLocaleString()}円（${reductionSaving.toLocaleString()}円の節約）`,
      });
      legalBasis.push({
        law: '租税特別措置法第91条の4',
        description: `軽減措置期限: ${STAMP_DUTY_META.reductionExpiry}まで`,
      });
    }
  }

  if (taxAmount === 0) {
    legalBasis.push({ law: '印紙税法 別表第一', description: `第${formatClassNumber(classNumber)}号文書: 非課税（${formatAmount(amount)}）` });
  } else {
    legalBasis.push({ law: '印紙税法 別表第一', description: `第${formatClassNumber(classNumber)}号文書: ${taxAmount.toLocaleString()}円（${formatAmount(amount)}）` });
  }

  return {
    taxAmount,
    classNumber,
    classLabel: cls.label,
    isReduction,
    reductionSaving,
    legalBasis,
    warnings: buildWarnings(warnings),
    consumptionTaxNote,
  };
}

/**
 * 階段税率テーブルから金額に対応する税額を検索する。
 * limit は「以下」（<=）で比較する。
 * 「未満」のブラケットは data.ts 側で limit を -1 して調整済み
 * （例: 「1万円未満」→ limit: 9_999）。
 */
function lookupBracket(brackets: readonly TaxBracket[], amount: number): number {
  for (const bracket of brackets) {
    if (amount <= bracket.limit) {
      return bracket.amount;
    }
  }
  // 最後のブラケット（Infinity）にマッチするはず
  return brackets[brackets.length - 1].amount;
}

/** 号番号を表示用にフォーマット（"1-1" → "1号の1", "17-1" → "17号の1"） */
function formatClassNumber(classNumber: string): string {
  if (classNumber.includes('-')) {
    const [main, sub] = classNumber.split('-');
    return `${main}号の${sub}`;
  }
  return `${classNumber}`;
}

/** 金額を表示用にフォーマット */
function formatAmount(amount: number): string {
  return `記載金額${amount.toLocaleString()}円`;
}

/** 共通の注意事項を追加 */
function buildWarnings(warnings: string[]): string[] {
  return [
    ...warnings,
    '印紙を貼り付けなかった場合、本来の印紙税額の3倍の過怠税が課されます（自己申告の場合は1.1倍）',
    '仮契約書・予約契約書は本契約書とは別に独立して課税されます',
  ];
}

/**
 * 変更契約書の記載金額を調整する（通則4 / 国税庁 No.7123）。
 *
 * - 変更前特定可 + 増額 → 増額分のみが記載金額
 * - 変更前特定可 + 減額 → 記載金額なし（null）
 * - 変更前特定不可 or 非変更 → 入力金額をそのまま使用
 */
export function adjustAmendmentAmount(
  originalAmount: number | null,
  isAmendment?: boolean,
  priorIdentifiable?: boolean,
  amendmentDirection?: 'increase' | 'decrease',
  amendmentAmount?: number,
): number | null {
  if (!isAmendment || !priorIdentifiable) return originalAmount;
  if (amendmentDirection === 'decrease') return null;
  if (amendmentDirection === 'increase' && amendmentAmount != null) return amendmentAmount;
  return originalAmount;
}
