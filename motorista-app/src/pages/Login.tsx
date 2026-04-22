import { useState } from 'react'
import { supabase, setSessao } from '../lib/supabase'

interface Props {
  onLogin: (id: string, nome: string) => void
}

export default function Login({ onLogin }: Props) {
  const [nome, setNome] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')

  async function entrar() {
    const nomeTrimmed = nome.trim()
    if (!nomeTrimmed) { setErro('Digite seu nome para continuar.'); return }

    setEntrando(true)
    setErro('')

    const { data, error } = await supabase
      .from('motoristas')
      .select('*')
      .ilike('nome', nomeTrimmed)
      .eq('ativo', true)
      .maybeSingle()

    console.log('Login result:', data, error)

    if (error) {
      setErro(`Erro de conexão: ${error.message}`)
      setEntrando(false)
      return
    }

    if (!data) {
      setErro('Usuário não encontrado.')
      setEntrando(false)
      return
    }

    setSessao({ motorista_id: data.id, motorista_nome: data.nome })
    onLogin(data.id, data.nome)
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <img src="/logo.svg" alt="Trans Ambiental" style={s.logo} />
        <h1 style={s.titulo}>Área do Motorista</h1>
        <p style={s.sub}>Trans Ambiental · Controle de Caçambas</p>

        <label style={s.label}>Seu nome</label>
        <input
          style={s.input}
          placeholder="Digite seu nome completo"
          value={nome}
          onChange={e => { setNome(e.target.value); setErro('') }}
          onKeyDown={e => e.key === 'Enter' && entrar()}
          autoComplete="off"
          autoCapitalize="words"
        />

        {erro && <p style={s.erro}>{erro}</p>}

        <button
          style={{ ...s.btn, opacity: entrando ? 0.7 : 1 }}
          onClick={entrar}
          disabled={entrando}
        >
          {entrando ? 'Verificando...' : 'Entrar'}
        </button>
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
  input: {
    width: '100%',
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    background: 'hsl(140 14% 14%)',
    border: '1px solid hsl(140 14% 22%)',
    borderRadius: '0.75rem',
    color: 'hsl(140 10% 85%)',
    marginBottom: '1.25rem',
    boxSizing: 'border-box' as const,
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
  erro: {
    color: 'hsl(0 70% 60%)',
    fontSize: '0.82rem',
    marginTop: '-0.75rem',
    marginBottom: '0.75rem',
    alignSelf: 'flex-start',
  },
}
