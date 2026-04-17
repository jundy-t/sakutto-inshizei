/**
 * サクッと印紙税 — 型定義
 *
 * ウィザードの回答・文書分類結果・税額計算結果の型。
 * data.ts のデータ型（TaxBracket, DocumentClass 等）は data.ts 側で定義。
 */

// ============================================================
// ウィザード入力
// ============================================================

/** Step1: 文書の種類 */
export type DocCategory =
  | 'sale_transfer'      // 売買・譲渡の契約書
  | 'construction'       // 工事・製造の請負契約書
  | 'service'            // 業務委託・サービス契約書
  | 'lease'              // 賃貸借契約書
  | 'loan'               // 金銭貸借・借用証書
  | 'receipt'            // 領収書・受取書
  | 'bill_of_exchange'   // 手形
  | 'corporate'          // 会社設立・合併・分割
  | 'basic_agreement'    // 取引基本契約書
  | 'other';             // その他・よくわからない

/** Step2: 不動産の関与 */
export type RealEstateInvolvement =
  | 'land'               // 土地が関係する
  | 'building'           // 建物のみ
  | 'land_and_building'  // 土地と建物の両方
  | 'none';              // 不動産は関係しない

/** Step1b: 継続的取引（取引基本契約書の場合のみ） */
export type ContinuityType =
  | 'yes_over_3months'              // 3ヶ月超 or 自動更新あり
  | 'yes_under_3months_no_renewal'; // 3ヶ月以内で更新なし

/** Step3: 消費税の記載方法 */
export type TaxNotation =
  | 'tax_separated'      // 区分記載あり（消費税額が明記）
  | 'tax_included_only'  // 税込金額のみ記載
  | 'no_tax';            // 消費税なし（非課税取引等）

/** ウィザードの全回答 */
export interface WizardAnswers {
  docCategory: DocCategory;
  /** service 選択時: 請負(true) or 委任(false) */
  isUkeoi?: boolean;
  /** Step2: 不動産の関与（sale_transfer / construction / lease / other の場合） */
  realEstate?: RealEstateInvolvement;
  /** Step1b: 継続性（basic_agreement の場合のみ） */
  continuity?: ContinuityType;
  /** Step3: 契約金額 or 受取金額（円）。未入力 = 記載金額なし */
  amount?: number;
  /** Step3: 消費税の記載方法 */
  taxNotation?: TaxNotation;
  /** Step3: 消費税額（tax_separated の場合） */
  consumptionTaxAmount?: number;
  /** receipt 選択時: 営業に関する受取書か */
  isBusinessActivity?: boolean;
  /** bill_of_exchange 選択時: 特例手形か */
  isSpecialBill?: boolean;
  /** 変更契約書かどうか */
  isAmendment?: boolean;
  /** 変更前の契約書を特定できるか（isAmendment=true の場合） */
  priorIdentifiable?: boolean;
  /** 増額 or 減額（priorIdentifiable=true の場合） */
  amendmentDirection?: 'increase' | 'decrease';
  /** 増額分の金額（amendmentDirection='increase' の場合。円） */
  amendmentAmount?: number;
}

// ============================================================
// 文書分類の結果
// ============================================================

/** 課税文書 */
export interface TaxableResult {
  type: 'taxable';
  classNumber: string;
  label: string;
  /** 軽減措置の対象か（第1号の1 不動産譲渡 / 第2号 建設工事請負） */
  isReduction: boolean;
  /** 出典URL（国税庁タックスアンサー） */
  source: string;
  /** 複数号該当（通則3適用）の追加検討UI用。リスクが高い号にのみ付与される。 */
  hybridOptions?: readonly HybridOption[];
}

/** 追加検討UIのチェック候補（data.ts の HybridOption を再エクスポート用型） */
export interface HybridOption {
  readonly id: string;
  readonly label: string;
  readonly linkedClass: string;
  readonly helpText: string;
}

/** 通則3エンジンの結果 */
export interface Rule3Result {
  /** 最終的に所属する号 */
  finalClass: string;
  /** 当初号から変更されたか */
  changed: boolean;
  /** 適用されたルール（"通則3イ" / "通則3ロ" / "通則3ハ" / "通則3ニ" / 例外ラベル） */
  appliedRule: string;
  /** ユーザー向け説明文 */
  explanation: string;
}

/** 不課税文書 */
export interface NonTaxableResult {
  type: 'non_taxable';
  reason: string;
  source: string;
  caveat: string;
}

/** 定額課税（金額入力不要: 第5号〜第7号等） */
export interface FixedResult {
  type: 'fixed';
  classNumber: string;
  label: string;
  fixedAmount: number;
  /** 出典URL（国税庁タックスアンサー） */
  source: string;
  /** 複数号該当（通則3適用）の追加検討UI用。第7号のようなリスク号のみ付与される。 */
  hybridOptions?: readonly HybridOption[];
}

export type ClassificationResult = TaxableResult | NonTaxableResult | FixedResult;

// ============================================================
// 税額計算の結果
// ============================================================

export interface TaxResult {
  /** 印紙税額（円） */
  taxAmount: number;
  /** 該当する号番号 */
  classNumber: string;
  /** 該当する号の名称 */
  classLabel: string;
  /** 軽減措置が適用されたか */
  isReduction: boolean;
  /** 軽減で節約した額（null = 軽減なし） */
  reductionSaving: number | null;
  /** 根拠条文リスト */
  legalBasis: string[];
  /** 注意事項（過怠税、仮契約書は別途課税等） */
  warnings: string[];
  /** 消費税の扱いに関する説明（null = 説明不要） */
  consumptionTaxNote: string | null;
}
