import { useState, useEffect } from 'react'
import { getSessao } from './lib/supabase'
import Login from './pages/Login'
import NovasTroca from './pages/NovasTroca'
import MinhasTrocas from './pages/MinhasTrocas'

type Tela = 'login' | 'nova-troca' | 'minhas-trocas'

export default function App() {
  const [tela, setTela] = useState<Tela>('login')
  const [motoristaId, setMotoristaId] = useState('')
  const [motoristaNome, setMotoristaNome] = useState('')

  useEffect(() => {
    const s = getSessao()
    if (s) {
      setMotoristaId(s.motorista_id)
      setMotoristaNome(s.motorista_nome)
      setTela('nova-troca')
    }
  }, [])

  function handleLogin(id: string, nome: string) {
    setMotoristaId(id)
    setMotoristaNome(nome)
    setTela('nova-troca')
  }

  function handleLogout() {
    setMotoristaId('')
    setMotoristaNome('')
    setTela('login')
  }

  if (tela === 'login') {
    return <Login onLogin={handleLogin} />
  }

  if (tela === 'minhas-trocas') {
    return (
      <MinhasTrocas
        motoristaId={motoristaId}
        onVoltar={() => setTela('nova-troca')}
      />
    )
  }

  return (
    <NovasTroca
      motoristaId={motoristaId}
      motoristaNome={motoristaNome}
      onLogout={handleLogout}
      onVerTrocas={() => setTela('minhas-trocas')}
    />
  )
}
