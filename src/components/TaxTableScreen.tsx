/**
 * 早見表画面
 * 全20号の印紙税額を一覧表示。号を選んで金額入力 → 税額計算。
 */

import { useState } from 'react';
import { DOCUMENT_CLASSES } from '../data/sources/nta-inshizei/data';

interface TaxTableScreenProps {
  onSelect: (classNumber: string, amount: number | null, isReduction: boolean) => void;
  onBack: () => void;
}

export function TaxTableScreen({ onSelect, onBack }: TaxTableScreenProps) {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [amountStr, setAmountStr] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedDoc = DOCUMENT_CLASSES.find(d => d.number === selectedClass);

  // よく使われる別名（シノニム）マップ
  // ネットでの実際の検索語を調査して作成（法律用語と一般的な呼び方のギャップを補完）
  const SYNONYMS: Record<string, string[]> = {
    '1-1': ['売買契約書', '不動産売買', '土地売買', '譲渡契約書', '不動産交換', '売渡証書', '営業譲渡'],
    '1-2': ['借地契約', '地代', '土地賃貸借', '土地賃料', '借地権'],
    '1-3': ['借用書', '借用証書', '金銭消費貸借', 'ローン契約', '金銭借用証書', '金消契約'],
    '1-4': ['運送契約', '配送', '貨物運送', '傭船'],
    '2': ['工事契約', '工事請負', '請負契約書', '業務委託', '外注', '注文請書', '請書', '発注請書', '広告契約', '物品加工'],
    '3': ['手形', '約手', '為手', '約束手形', '為替手形'],
    '4': ['株式', '株券', '社債', '出資証券', '受益証券', '投資信託'],
    '5': ['合併', '分割', '会社分割', '吸収合併', '新設分割'],
    '6': ['定款', '設立', '会社設立', '原始定款'],
    '7': ['基本契約', '取引基本', '特約店契約', '代理店契約', 'フランチャイズ', '銀行取引約定書', '継続取引'],
    '8': ['預金', '貯金', '預金証書', '貯金証書'],
    '9': ['倉庫', '船荷', '倉荷証券', '複合運送'],
    '10': ['保険', '保険証券'],
    '11': ['信用状'],
    '12': ['信託', '信託契約'],
    '13': ['保証', '保証書', '保証契約', '債務保証'],
    '14': ['寄託', '預け'],
    '15': ['債権譲渡', '債務引受', '債権'],
    '16': ['配当', '振込通知'],
    '17-1': ['領収書', '領収証', 'レシート', '受領書', '受領証明書', '売上代金', '受取書'],
    '17-2': ['領収書', '領収証', '受領書', '借入金受取', '保険金受取'],
    '18': ['通帳', '預金通帳', '貯金通帳', '保険料通帳'],
    '19': ['付込', '付込証明通帳'],
    '20': ['判取帳'],
  };

  // 検索フィルタ: 号数 or 文書名 or シノニムでマッチ
  const filteredDocs = DOCUMENT_CLASSES.filter(doc => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    // 号数でマッチ（"2", "17", "1の1" 等）
    const numberStr = doc.number.replace('-', 'の');
    if (numberStr.includes(q) || doc.number.includes(q)) return true;
    // 文書名でマッチ
    if (doc.label.toLowerCase().includes(q)) return true;
    // 定義でマッチ
    if (doc.definition.toLowerCase().includes(q)) return true;
    // シノニムでマッチ
    const synonyms = SYNONYMS[doc.number];
    if (synonyms?.some(s => s.toLowerCase().includes(q) || q.includes(s.toLowerCase()))) return true;
    return false;
  });

  const handleSubmit = () => {
    if (!selectedClass) return;
    const amount = amountStr ? parseInt(amountStr.replace(/,/g, ''), 10) : null;
    const hasReduction = selectedDoc?.reductionBrackets != null;
    onSelect(selectedClass, amount, hasReduction);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-text">印紙税額 早見表</h2>
        <p className="text-sm text-text-muted">号数や文書名で検索できます</p>
      </div>

      {/* 号の一覧 */}
      {!selectedClass && (
        <>
          {/* 検索フィルタ */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="例: 2号、請負、領収書、手形"
              className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
          {filteredDocs.length === 0 ? (
            <div className="text-center text-sm text-text-muted py-8">
              該当する文書が見つかりません
            </div>
          ) : filteredDocs.map(doc => (
            <button
              key={doc.number}
              type="button"
              onClick={() => setSelectedClass(doc.number)}
              className="w-full bg-card hover:bg-card-hover border border-border rounded-lg p-3 text-left transition-colors"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-primary-light font-mono shrink-0">
                  第{doc.number.replace('-', 'の')}号
                </span>
                <span className="text-sm text-text truncate">{doc.label}</span>
              </div>
              <div className="text-xs text-text-muted mt-0.5 ml-12">
                {doc.taxType === 'fixed' && `一律 ${doc.fixedAmount?.toLocaleString()}円`}
                {doc.taxType === 'annual' && `1年につき ${doc.annualAmount?.toLocaleString()}円`}
                {doc.taxType === 'bracket' && '金額に応じて変動'}
                {doc.reductionBrackets && ' ※軽減措置あり'}
              </div>
            </button>
          ))}
          </div>
        </>
      )}

      {/* 金額入力（bracket型の場合） */}
      {selectedClass && selectedDoc && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="text-sm font-bold text-primary-light">
              第{selectedDoc.number.replace('-', 'の')}号: {selectedDoc.label}
            </div>
            <div className="text-xs text-text-muted mt-1">{selectedDoc.definition}</div>
          </div>

          {selectedDoc.taxType === 'bracket' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  金額（円）
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value.replace(/[^\d,]/g, ''))}
                  placeholder="例: 30000000"
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold rounded-xl py-3 transition-colors"
              >
                税額を計算する
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onSelect(selectedDoc.number, null, false)}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold rounded-xl py-3 transition-colors"
            >
              税額を確認する
            </button>
          )}

          <button
            type="button"
            onClick={() => { setSelectedClass(null); setAmountStr(''); }}
            className="w-full text-sm text-text-muted hover:text-text py-2"
          >
            ← 一覧に戻る
          </button>
        </div>
      )}

      <button type="button" onClick={onBack} className="w-full text-sm text-text-muted hover:text-text py-2">
        ← トップに戻る
      </button>
    </div>
  );
}
