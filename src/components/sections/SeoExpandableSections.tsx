const LAST_UPDATED = '2026-04-16';

const FAQS = [
  {
    q: '入力した内容は外部に送信されますか？',
    a: '本ツールの判定処理はすべてブラウザ内で完結します。入力した契約書の種類・金額等は外部サーバーへ送信されません（フィードバックフォームを使った場合のみ Google Forms に送信されます）。',
  },
];

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="bg-card border border-border rounded-xl group">
      <summary className="cursor-pointer select-none px-4 py-3 hover:bg-card-hover rounded-xl flex justify-between items-center text-text">
        <span role="heading" aria-level={3} className="font-medium">{title}</span>
        <svg className="w-4 h-4 transition-transform group-open:rotate-180 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </summary>
      <div className="px-4 pb-4 pt-2 text-sm text-text-muted space-y-3">
        {children}
      </div>
    </details>
  );
}

export function SeoExpandableSections() {
  return (
    <section className="space-y-3 mt-8">
      <h2 className="text-lg font-bold text-text mb-2">このツールについて</h2>
      <DetailSection title="よくある質問（FAQ）">
        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <p className="font-medium text-text">Q. {faq.q}</p>
              <p className="mt-1">{faq.a}</p>
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="根拠となる法令・情報源">
        <ul className="space-y-1">
          <li><a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7140.htm" target="_blank" rel="noopener noreferrer" className="underline hover:text-text">国税庁 No.7140 印紙税額の一覧表</a></li>
          <li><a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7141.htm" target="_blank" rel="noopener noreferrer" className="underline hover:text-text">国税庁 No.7141 印紙税額の一覧表（その2）</a></li>
          <li><a href="https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7108.htm" target="_blank" rel="noopener noreferrer" className="underline hover:text-text">国税庁 No.7108 不動産の譲渡・建設工事の請負の軽減措置</a></li>
          <li><a href="https://www.nta.go.jp/law/shitsugi/inshi/02/10.htm" target="_blank" rel="noopener noreferrer" className="underline hover:text-text">国税庁 質疑応答事例 — 電子契約と印紙税</a></li>
          <li><a href="https://laws.e-gov.go.jp/law/342AC0000000023" target="_blank" rel="noopener noreferrer" className="underline hover:text-text">e-Gov 法令検索 — 印紙税法</a></li>
          <li><a href="https://www.nta.go.jp/law/tsutatsu/kihon/inshi/mokuji.htm" target="_blank" rel="noopener noreferrer" className="underline hover:text-text">国税庁 印紙税法基本通達</a></li>
        </ul>
      </DetailSection>

      <DetailSection title="運営者情報">
        <ul className="space-y-1">
          <li><strong>サービス名:</strong> サクッと印紙税</li>
          <li><strong>運営:</strong> <a href="https://haraochi.jp/" target="_blank" rel="noopener noreferrer" className="underline hover:text-text">サクッと</a>（個人事業主・フリーランス向け無料ツール集）</li>
          <li><strong>最終更新:</strong> {LAST_UPDATED}</li>

        </ul>
      </DetailSection>
    </section>
  );
}
