import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { FeedbackSection } from './components/shared/FeedbackSection'

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <Header />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 space-y-6">
        <section className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-bold text-primary-light mb-2">
            サクッと印紙税 へようこそ
          </h2>
          <p className="text-sm text-text-muted">
            ここにメインコンテンツを実装してください。<code className="text-xs bg-card-hover px-1 py-0.5 rounded">src/core/</code> にビジネスロジック、<code className="text-xs bg-card-hover px-1 py-0.5 rounded">src/data/</code> にマスターデータを配置します。
          </p>
        </section>
        <FeedbackSection />
      </main>
      <Footer />
    </div>
  )
}

export default App
