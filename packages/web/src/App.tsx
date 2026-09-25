import LogStreamPanel from './LogStreamPanel'
import RequestRunner from './RequestRunner'
import HistoryPanel from './components/HistoryPanel'

function App() {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="mx-auto mb-8 max-w-5xl text-3xl font-semibold">DevTool</h1>
      <div className="mx-auto mb-6 max-w-5xl">
        <RequestRunner />
      </div>
      <LogStreamPanel />
      <section className="mx-auto mt-6 max-w-5xl rounded-xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl">
        <h2 className="text-xl font-semibold text-slate-100">Historial</h2>
        <div className="mt-4">
          <HistoryPanel />
        </div>
      </section>
    </main>
  )
}

export default App
