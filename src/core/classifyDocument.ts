/**
 * 文書分類ロジック
 *
 * ウィザードの回答から「この文書は第何号か」を判定する。
 * 不課税文書（建物賃貸借、委任契約等）の判定も行う。
 */

import {
  DOCUMENT_CLASSES,
  NON_TAXABLE_DOCUMENTS,
  HYBRID_RISK_CLASSES,
  HYBRID_OPTIONS,
} from '../data/sources/nta-inshizei/data';
import type {
  WizardAnswers,
  ClassificationResult,
  DocCategory,
  RealEstateInvolvement,
  HybridOption,
} from './types';

/** 号番号から出典URL（国税庁タックスアンサー）を返す */
function sourceUrlForClass(classNumber: string): string {
  const major = parseInt(classNumber.split('-')[0], 10);
  return major <= 4
    ? 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7140.htm'
    : 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7141.htm';
}

/**
 * ウィザードの回答から文書を分類する。
 *
 * @returns 課税文書 / 不課税文書 / 定額課税 のいずれか
 */
export function classifyDocument(answers: WizardAnswers): ClassificationResult {
  const { docCategory, realEstate, isUkeoi, continuity, isBusinessActivity } = answers;

  // ──────────────────────────────────────
  // 1. 不課税チェック
  // ──────────────────────────────────────

  // 委任契約 → 不課税
  if (docCategory === 'service' && isUkeoi === false) {
    const entry = NON_TAXABLE_DOCUMENTS.find(d => d.label === '委任契約書・準委任契約書')!;
    return { type: 'non_taxable', reason: entry.reason, source: entry.source, caveat: entry.caveat };
  }

  // 建物のみの賃貸借 → 不課税
  if (docCategory === 'lease' && realEstate === 'building') {
    const entry = NON_TAXABLE_DOCUMENTS.find(d => d.label === '建物賃貸借契約書')!;
    return { type: 'non_taxable', reason: entry.reason, source: entry.source, caveat: entry.caveat };
  }

  // 動産売買 → 不課税
  if (docCategory === 'sale_transfer' && realEstate === 'none') {
    const entry = NON_TAXABLE_DOCUMENTS.find(d => d.label === '物品売買契約書（動産の売買）')!;
    return { type: 'non_taxable', reason: entry.reason, source: entry.source, caveat: entry.caveat };
  }

  // 領収書で営業に関しない → 不課税
  if (docCategory === 'receipt' && isBusinessActivity === false) {
    return {
      type: 'non_taxable',
      reason: '営業に関しない受取書は印紙税法上の課税文書に該当しない',
      source: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7125.htm',
      caveat: '',
    };
  }

  // 取引基本契約書で3ヶ月以内+更新なし → 第7号の非課税
  if (docCategory === 'basic_agreement' && continuity === 'yes_under_3months_no_renewal') {
    return {
      type: 'non_taxable',
      reason: '契約期間が3か月以内で、かつ更新の定めのないものは第7号文書の非課税物件',
      source: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7141.htm',
      caveat: '',
    };
  }

  // ──────────────────────────────────────
  // 2. 定額課税（金額入力不要）
  // ──────────────────────────────────────

  if (docCategory === 'corporate') {
    // 第5号（合併・分割）か第6号（定款）かはここでは第5号を返す
    // UI側で「定款ですか？合併ですか？」の追加質問で分岐可能
    const cls = DOCUMENT_CLASSES.find(d => d.number === '5')!;
    return { type: 'fixed', classNumber: '5', label: cls.label, fixedAmount: cls.fixedAmount!, source: sourceUrlForClass('5') };
  }

  if (docCategory === 'basic_agreement' && continuity === 'yes_over_3months') {
    const cls = DOCUMENT_CLASSES.find(d => d.number === '7')!;
    return {
      type: 'fixed',
      classNumber: '7',
      label: cls.label,
      fixedAmount: cls.fixedAmount!,
      source: sourceUrlForClass('7'),
      hybridOptions: getHybridOptions('7'),
    };
  }

  // ──────────────────────────────────────
  // 3. 課税文書（号番号の決定）
  // ──────────────────────────────────────

  const classNumber = resolveClassNumber(docCategory, realEstate);
  const cls = DOCUMENT_CLASSES.find(d => d.number === classNumber);

  if (!cls) {
    // フォールバック: 分類できない場合は「その他」として第1号の1を返す
    const fallback = DOCUMENT_CLASSES.find(d => d.number === '1-1')!;
    return { type: 'taxable', classNumber: '1-1', label: fallback.label, isReduction: false, source: sourceUrlForClass('1-1') };
  }

  // 軽減措置の対象判定
  const isReduction = checkReduction(classNumber, docCategory, realEstate);

  return {
    type: 'taxable',
    classNumber,
    label: cls.label,
    isReduction,
    source: isReduction
      ? 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7108.htm'
      : sourceUrlForClass(classNumber),
    hybridOptions: getHybridOptions(classNumber),
  };
}

/**
 * 号番号に対応するハイブリッド候補（通則3適用対象）を返す。
 * HYBRID_RISK_CLASSES に含まれない号は undefined を返す。
 */
function getHybridOptions(classNumber: string): readonly HybridOption[] | undefined {
  if (!HYBRID_RISK_CLASSES.includes(classNumber)) return undefined;
  return HYBRID_OPTIONS[classNumber];
}

/**
 * docCategory + realEstate から号番号を決定する。
 */
function resolveClassNumber(
  docCategory: DocCategory,
  realEstate?: RealEstateInvolvement,
): string {
  switch (docCategory) {
    case 'sale_transfer':
      // 不動産譲渡 → 第1号の1、不動産以外はここに来ない（動産は不課税で除外済み）
      return '1-1';

    case 'construction':
      return '2';

    case 'service':
      // isUkeoi === true（請負）の場合のみここに来る（委任は不課税で除外済み）
      return '2';

    case 'lease':
      // 建物のみは不課税で除外済み。ここに来るのは土地が絡む場合
      return '1-2';

    case 'loan':
      return '1-3';

    case 'receipt':
      // 営業に関しない受取書は不課税で除外済み
      return '17-1';

    case 'bill_of_exchange':
      return '3';

    case 'basic_agreement':
      // continuity の判定で fixed/non_taxable は除外済み
      return '7';

    case 'other':
      // 不動産が絡む場合は第1号の1、それ以外はユーザーに確認が必要だが
      // フォールバックとして第1号の1を返す
      if (realEstate === 'land' || realEstate === 'land_and_building') {
        return '1-1';
      }
      return '1-1';

    default:
      return '1-1';
  }
}

/**
 * 軽減措置の対象かどうかを判定する。
 * 第1号の1（不動産譲渡）と第2号（建設工事請負）のみ。
 */
function checkReduction(
  classNumber: string,
  docCategory: DocCategory,
  realEstate?: RealEstateInvolvement,
): boolean {
  // 第1号の1: 不動産の譲渡に関する契約書
  if (classNumber === '1-1' && docCategory === 'sale_transfer') {
    return realEstate === 'land' || realEstate === 'land_and_building';
  }

  // 第2号: 建設工事の請負に関する契約書
  if (classNumber === '2' && docCategory === 'construction') {
    return true;
  }

  return false;
}
