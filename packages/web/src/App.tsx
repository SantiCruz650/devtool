import LogStreamPanel from './LogStreamPanel'
import RequestRunner from './RequestRunner'

function App() {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="mx-auto mb-8 max-w-5xl text-3xl font-semibold">DevTool</h1>
      <div className="mx-auto mb-6 max-w-5xl">
        <RequestRunner />
      </div>
      <LogStreamPanel />
    </main>
  )
}

export default App
