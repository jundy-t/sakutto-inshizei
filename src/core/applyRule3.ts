/**
 * 通則3エンジン: 複数号該当時の所属決定
 *
 * 印紙税法 別表第一 通則3 および基本通達11〜14条のロジックを実装。
 * 当初判定の号と追加該当の号リストを受け取り、最終的に所属する号を決定する。
 *
 * 判定優先順（通則3 イ→ロ→ハ→ニ）:
 *   イ: 第1号/第2号 vs 第3〜17号 → 原則1号/2号優先
 *     例外1: 1号/2号に金額記載なし + 第7号該当 → 第7号
 *     例外2: 1号/2号に金額記載なし + 第17号売上代金100万円超 → 第17号
 *   ロ: 第1号 vs 第2号 → 原則1号優先（金額区分可能で2号金額>1号金額なら2号）
 *   ハ: 第3〜17号同士 → 号数の小さい方（17号売上代金100万円超なら17号）
 *   ニ: 証書(1〜17) vs 通帳(18〜20) → 通帳優先
 *   ホ: 19/20号 + 高額証書 → 証書側優先（本エンジンでは対象外）
 */

import type { Rule3Result } from './types';

export interface Rule3Input {
  /** 当初判定の号番号 */
  primary: string;
  /** 追加で該当する号番号のリスト（primary と重複していてもOK） */
  additions: readonly string[];
  /** 記載金額（円）。null = 記載金額なし。金額比較・100万円判定に使う */
  amount: number | null;
  /**
   * 号別の金額（任意）。契約書上で金額区分が可能な場合にUIから渡される。
   * 通則3ロの例外判定（2号金額 > 1号金額 → 2号に所属）に使用。
   * 通則4: 「2以上の号に該当し金額区分可能 → 所属する号の金額のみが記載金額」
   */
  amountByClass?: Readonly<Record<string, number>>;
}

export function applyRule3(input: Rule3Input): Rule3Result {
  const all = dedupe([input.primary, ...input.additions]);

  if (all.length === 1) {
    return {
      finalClass: input.primary,
      changed: false,
      appliedRule: 'none',
      explanation: '他に該当する号がないため、当初の判定どおりです。',
    };
  }

  const majors = all.map(majorOf);
  const has1or2 = majors.some(m => m === 1 || m === 2);
  const has3to17 = majors.some(m => m >= 3 && m <= 17);
  const has18to20 = majors.some(m => m >= 18 && m <= 20);
  const noAmount = input.amount === null || input.amount === undefined;

  // ──────────────────────────────────────
  // (ニ) 証書(1〜17) vs 通帳(18〜20) → 通帳優先
  // ──────────────────────────────────────
  if (has18to20 && (has1or2 || has3to17)) {
    const tuchou = all.find(n => majorOf(n) >= 18)!;
    return {
      finalClass: tuchou,
      changed: tuchou !== input.primary,
      appliedRule: '通則3ニ',
      explanation: '第1〜17号の証書と第18〜20号の通帳等に該当する場合、原則として通帳等に所属します（高額証書の例外は本ツール対象外）。',
    };
  }

  // ──────────────────────────────────────
  // (イ) 第1号/2号 vs 第3〜17号
  // ──────────────────────────────────────
  if (has1or2 && has3to17) {
    const has7 = all.includes('7');
    const has17 = all.some(n => majorOf(n) === 17);

    // 例外1: 1号/2号に金額記載なし + 第7号該当 → 第7号
    if (noAmount && has7) {
      return {
        finalClass: '7',
        changed: input.primary !== '7',
        appliedRule: '通則3イ 例外（1号/2号金額なし + 7号）',
        explanation: '第1号または第2号に記載金額がなく、かつ第7号（継続的取引の基本となる契約書）にも該当する場合、第7号に所属します。',
      };
    }

    // 例外2: 1号/2号に金額記載なし + 第17号売上代金100万円超 → 第17号
    if (noAmount && has17) {
      const n17 = all.find(n => majorOf(n) === 17)!;
      return {
        finalClass: n17,
        changed: input.primary !== n17,
        appliedRule: '通則3イ 例外（1号/2号金額なし + 17号）',
        explanation: '第1号または第2号に記載金額がなく、かつ第17号の売上代金受取に該当する場合、売上代金が100万円を超えるときは第17号に所属します（100万円以下は当初号に留まる可能性あり、要確認）。',
      };
    }

    // 例外3: 17号の売上代金100万円超 → 17号（金額が1号/2号金額を上回る前提の実務扱い）
    // 本ツールは金額区分を扱わないため、金額記載ありで17号+1号/2号の併存は保守的に原則どおり1号/2号を維持
    // （より厳密な判定はユーザーに「専門家相談」を案内する）

    // 原則: 1号/2号優先。内部に1号と2号が両方あれば後段ロで判定
    const candidates1or2 = all.filter(n => majorOf(n) === 1 || majorOf(n) === 2);
    if (candidates1or2.length >= 2) {
      const n1 = candidates1or2.find(n => majorOf(n) === 1);
      const n2 = candidates1or2.find(n => majorOf(n) === 2);
      if (n1 && n2) {
        // 通則3ロ: 金額区分が可能で2号金額 > 1号金額の場合は2号に所属
        const rule3RoResult = applyRule3Ro(n1, n2, input);
        return rule3RoResult;
      }
    }

    const n1or2 = candidates1or2[0];
    return {
      finalClass: n1or2,
      changed: input.primary !== n1or2,
      appliedRule: '通則3イ',
      explanation: '第1号/第2号と第3〜17号に該当する場合、原則として第1号/第2号に所属します。',
    };
  }

  // ──────────────────────────────────────
  // (ロ) 第1号 vs 第2号のみ
  // ──────────────────────────────────────
  if (has1or2 && !has3to17) {
    const n1 = all.find(n => majorOf(n) === 1);
    const n2 = all.find(n => majorOf(n) === 2);
    if (n1 && n2) {
      return applyRule3Ro(n1, n2, input);
    }
  }

  // ──────────────────────────────────────
  // (ハ) 第3〜17号同士
  // ──────────────────────────────────────
  if (!has1or2 && has3to17) {
    const has17 = all.some(n => majorOf(n) === 17);
    const amt = input.amount ?? 0;

    // 例外: 17号売上代金100万円超 → 17号
    if (has17 && amt > 1_000_000) {
      const n17 = all.find(n => majorOf(n) === 17)!;
      return {
        finalClass: n17,
        changed: input.primary !== n17,
        appliedRule: '通則3ハ 例外（17号売上代金100万円超）',
        explanation: '第3〜17号の複数に該当し、第17号の売上代金受取額が100万円を超える場合、第17号に所属します。',
      };
    }

    // 原則: 号数の小さい方
    const minMajor = Math.min(...majors);
    const minClass = all.find(n => majorOf(n) === minMajor)!;
    return {
      finalClass: minClass,
      changed: input.primary !== minClass,
      appliedRule: '通則3ハ',
      explanation: `第3〜第17号の複数に該当する場合、号数の小さい方（第${minMajor}号）に所属します。`,
    };
  }

  // フォールバック（18〜20号のみ等、現状の対象外パターン）
  return {
    finalClass: input.primary,
    changed: false,
    appliedRule: 'none',
    explanation: '判定対象外のパターンのため、当初の判定を維持します。専門家相談を推奨します。',
  };
}

/**
 * 通則3ロ: 第1号 vs 第2号の所属決定
 *
 * 原則: 第1号に所属。
 * 例外: 金額区分が可能で、第2号の金額が第1号の金額を超える場合 → 第2号に所属。
 * 出典: 印紙税法 別表第一 通則3ロ、CLASSIFICATION_RULES.rule_ro
 */
function applyRule3Ro(n1: string, n2: string, input: Rule3Input): Rule3Result {
  if (input.amountByClass) {
    const amt1 = input.amountByClass[n1];
    const amt2 = input.amountByClass[n2];
    if (amt1 !== undefined && amt2 !== undefined && amt2 > amt1) {
      return {
        finalClass: n2,
        changed: input.primary !== n2,
        appliedRule: '通則3ロ 例外（金額区分で2号が上回る）',
        explanation: `金額区分が可能で、第2号の金額（${amt2.toLocaleString()}円）が第1号の金額（${amt1.toLocaleString()}円）を超えるため、第2号に所属します（通則3ロ例外、通則4）。`,
      };
    }
  }
  // 原則: 第1号優先
  return {
    finalClass: n1,
    changed: input.primary !== n1,
    appliedRule: '通則3ロ',
    explanation: '第1号と第2号に該当する場合、原則として第1号に所属します（金額区分ができて第2号金額が第1号金額を上回る場合を除く）。',
  };
}

/** 号番号を主番号（大分類）に変換（"1-1" → 1, "17-2" → 17, "7" → 7） */
function majorOf(classNumber: string): number {
  return parseInt(classNumber.split('-')[0], 10);
}

function dedupe<T>(arr: readonly T[]): T[] {
  return [...new Set(arr)];
}
