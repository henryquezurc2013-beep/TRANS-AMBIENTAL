import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) return (
      <div style={{padding:20,color:'red',background:'#1a1a1a',minHeight:'100vh'}}>
        <h2>ERRO CAPTURADO:</h2>
        <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all'}}>{(this.state.error as Error).message}</pre>
        <hr style={{borderColor:'#333'}}/>
        <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all',fontSize:'0.75rem',color:'#ff8888'}}>{(this.state.error as any).stack}</pre>
      </div>
    )
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
