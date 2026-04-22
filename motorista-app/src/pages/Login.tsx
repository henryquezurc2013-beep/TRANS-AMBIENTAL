import { useEffect, useState } from 'react'
import { supabase, setSessao, type Motorista } from '../lib/supabase'

interface Props {
  onLogin: (id: string, nome: string) => void
}

const SENHA_PADRAO = '102030'

export default function Login({ onLogin }: Props) {
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [selecionado, setSelecionado] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase
      .from('motoristas')
      .select('*')
      .order('nome')
      .then(({ data, error }) => {
        console.log('motoristas data:', data, 'error:', error)
        if (error) {
          setErroCarregamento(`Erro ao carregar: ${error.message}`)
        } else if (!data || data.length === 0) {
          setErroCarregamento('Nenhum motorista cadastrado no sistema.')
        } else {
          setMotoristas(data as Motorista[])
        }
        setLoading(false)
      })
  }, [])

  function entrar() {
    if (!selecionado) { setErro('Selecione seu nome para continuar.'); return }
    if (senha !== SENHA_PADRAO) { setErro('Senha incorreta.'); return }
    setEntrando(true)
    const m = motoristas.find(m => m.id === selecionado)!
    setSessao({ motorista_id: m.id, motorista_nome: m.nome })
    onLogin(m.id, m.nome)
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <img src="/logo.svg" alt="Trans Ambiental" style={s.logo} />
        <h1 style={s.titulo}>Área do Motorista</h1>
        <p style={s.sub}>Trans Ambiental · Controle de Caçambas</p>

        {loading ? (
          <div style={s.loading}>Carregando motoristas...</div>
        ) : erroCarregamento ? (
          <div style={s.erroCard}>{erroCarregamento}</div>
        ) : (
          <>
            <label style={s.label}>Seu nome</label>
            <select
              style={s.select}
              value={selecionado}
              onChange={e => { setSelecionado(e.target.value); setErro('') }}
            >
              <option value="">— Selecione —</option>
              {motoristas.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>

            <label style={s.label}>Senha</label>
            <input
              type="password"
              style={{ ...s.select, marginBottom: '1.25rem' }}
              placeholder="••••••"
              value={senha}
              onChange={e => { setSenha(e.target.value); setErro('') }}
              onKeyDown={e => e.key === 'Enter' && entrar()}
            />

            {erro && <p style={s.erro}>{erro}</p>}

            <button
              style={{ ...s.btn, opacity: entrando ? 0.7 : 1 }}
              onClick={entrar}
              disabled={entrando}
            >
              {entrando ? 'Entrando...' : 'Entrar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    background: 'hsl(140 15% 6%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
  },
  card: {
    width: '100%',
    maxWidth: '360px',
    background: 'hsl(140 14% 10%)',
    border: '1px solid hsl(140 14% 18%)',
    borderRadius: '1.25rem',
    padding: '2rem 1.75rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0',
  },
  logo: {
    width: '90px',
    height: 'auto',
    marginBottom: '1.25rem',
  },
  titulo: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'hsl(38 92% 60%)',
    margin: 0,
    textAlign: 'center',
  },
  sub: {
    fontSize: '0.8rem',
    color: 'hsl(140 10% 50%)',
    margin: '0.25rem 0 1.75rem',
    textAlign: 'center',
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'hsl(140 10% 60%)',
    marginBottom: '0.375rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  select: {
    width: '100%',
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    background: 'hsl(140 14% 14%)',
    border: '1px solid hsl(140 14% 22%)',
    borderRadius: '0.75rem',
    color: 'hsl(140 10% 85%)',
    marginBottom: '1.25rem',
    appearance: 'auto',
  },
  btn: {
    width: '100%',
    padding: '1rem',
    fontSize: '1rem',
    fontWeight: 700,
    background: 'hsl(38 92% 50%)',
    color: 'hsl(38 40% 10%)',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    letterSpacing: '0.03em',
  },
  loading: {
    color: 'hsl(140 10% 50%)',
    fontSize: '0.9rem',
    padding: '1rem 0',
  },
  erroCard: {
    background: 'hsl(0 50% 12%)',
    border: '1px solid hsl(0 50% 25%)',
    borderRadius: '0.75rem',
    padding: '1rem',
    color: 'hsl(0 70% 65%)',
    fontSize: '0.85rem',
    textAlign: 'center' as const,
    width: '100%',
    marginTop: '0.5rem',
  },
  erro: {
    color: 'hsl(0 70% 60%)',
    fontSize: '0.82rem',
    marginTop: '-0.75rem',
    marginBottom: '0.75rem',
    alignSelf: 'flex-start',
  },
}
