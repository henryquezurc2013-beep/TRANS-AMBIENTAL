import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase, clearSessao } from '../lib/supabase'

interface Props {
  motoristaId: string
  motoristaNome: string
  onLogout: () => void
  onVerTrocas: () => void
}

interface Cliente {
  id: string
  nome_cliente: string
}

type Tela = 'form' | 'sucesso'
type StatusContainer = 'idle' | 'loading' | 'found' | 'not_found'

export default function NovasTroca({ motoristaId, motoristaNome, onLogout, onVerTrocas }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteFiltro, setClienteFiltro] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState('')
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [cacambaRetirada, setCacambaRetirada] = useState('')
  const [statusContainer, setStatusContainer] = useState<StatusContainer>('idle')
  const [clienteEncontrado, setClienteEncontrado] = useState('')
  const [cacambaEntregue, setCacambaEntregue] = useState('')
  const [observacao, setObservacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [tela, setTela] = useState<Tela>('form')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase
      .from('clientes')
      .select('id, nome_cliente')
      .order('nome_cliente')
      .then(({ data }) => { if (data) setClientes(data as Cliente[]) })
  }, [])

  function handleCacambaRetirada(valor: string) {
    setCacambaRetirada(valor)
    setStatusContainer('idle')
    setClienteEncontrado('')

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!valor.trim()) return

    debounceRef.current = setTimeout(async () => {
      setStatusContainer('loading')
      const { data } = await supabase
        .from('controle')
        .select('cliente')
        .eq('id_container', valor.trim())
        .is('data_retirada', null)
        .maybeSingle()

      if (data?.cliente) {
        setClienteEncontrado(data.cliente)
        setClienteFiltro(data.cliente)
        setClienteSelecionado(data.cliente)
        setStatusContainer('found')
      } else {
        setStatusContainer('not_found')
      }
    }, 500)
  }

  const sugestoes = clienteFiltro.length >= 2
    ? clientes.filter(c => c.nome_cliente.toLowerCase().includes(clienteFiltro.toLowerCase())).slice(0, 8)
    : []

  function selecionarCliente(nome: string) {
    setClienteSelecionado(nome)
    setClienteFiltro(nome)
    setMostrarSugestoes(false)
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')

    const cliente = clienteSelecionado || clienteFiltro
    if (!cliente.trim())     { setErro('Informe o cliente.'); return }
    if (!cacambaRetirada.trim()) { setErro('Informe a caçamba retirada.'); return }
    if (!cacambaEntregue.trim()) { setErro('Informe a caçamba entregue.'); return }

    setEnviando(true)
    const { error } = await supabase.from('trocas_pendentes').insert({
      motorista_id:     motoristaId,
      motorista_nome:   motoristaNome,
      cliente:          cliente.trim(),
      cacamba_retirada: cacambaRetirada.trim(),
      cacamba_entregue: cacambaEntregue.trim(),
      observacao:       observacao.trim() || null,
      status:           'PENDENTE',
    })
    setEnviando(false)

    if (error) { setErro('Erro ao enviar. Tente novamente.'); return }
    setTela('sucesso')
  }

  function novaTroca() {
    setClienteFiltro('')
    setClienteSelecionado('')
    setCacambaRetirada('')
    setCacambaEntregue('')
    setObservacao('')
    setErro('')
    setStatusContainer('idle')
    setClienteEncontrado('')
    setTela('form')
  }

  function logout() {
    clearSessao()
    onLogout()
  }

  if (tela === 'sucesso') {
    return (
      <div style={s.page}>
        <div style={s.successCard}>
          <div style={s.successIcon}>✅</div>
          <h2 style={s.successTitulo}>Troca enviada!</h2>
          <p style={s.successMsg}>Aguardando aprovação do admin.</p>
          <button style={s.btnPrimary} onClick={novaTroca}>Nova troca</button>
          <button style={s.btnSecondary} onClick={onVerTrocas}>Ver minhas trocas</button>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.headerSub}>Olá,</div>
          <div style={s.headerNome}>{motoristaNome}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={s.btnHeader} onClick={onVerTrocas}>📋 Minhas trocas</button>
          <button style={s.btnHeaderLogout} onClick={logout}>Sair</button>
        </div>
      </div>

      {/* Formulário */}
      <div style={s.body}>
        <h2 style={s.formTitulo}>Nova Troca</h2>

        <form onSubmit={enviar} style={s.form}>
          {/* Cliente */}
          <div style={s.field}>
            <label style={s.label}>Cliente</label>
            <div style={{ position: 'relative' }}>
              <input
                style={s.input}
                placeholder="Digite para buscar..."
                value={clienteFiltro}
                onChange={e => {
                  setClienteFiltro(e.target.value)
                  setClienteSelecionado('')
                  setMostrarSugestoes(true)
                }}
                onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
                onFocus={() => clienteFiltro.length >= 2 && setMostrarSugestoes(true)}
                autoComplete="off"
              />
              {mostrarSugestoes && sugestoes.length > 0 && (
                <div style={s.sugestoes}>
                  {sugestoes.map(c => (
                    <div
                      key={c.id}
                      style={s.sugestaoItem}
                      onMouseDown={() => selecionarCliente(c.nome_cliente)}
                    >
                      {c.nome_cliente}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Caçambas */}
          <div style={s.row2}>
            <div style={s.field}>
              <label style={s.label}>Caçamba Retirada</label>
              <input
                style={{
                  ...s.input,
                  borderColor: statusContainer === 'found' ? 'hsl(140 60% 40%)' :
                               statusContainer === 'not_found' ? 'hsl(0 60% 45%)' :
                               'hsl(140 14% 20%)',
                }}
                placeholder="Nº container"
                value={cacambaRetirada}
                onChange={e => handleCacambaRetirada(e.target.value)}
                inputMode="text"
              />
              {statusContainer === 'loading' && (
                <span style={{ fontSize: '0.72rem', color: 'hsl(140 10% 45%)' }}>Buscando...</span>
              )}
              {statusContainer === 'found' && (
                <span style={{ fontSize: '0.72rem', color: 'hsl(140 60% 55%)', fontWeight: 600 }}>
                  ✅ {clienteEncontrado}
                </span>
              )}
              {statusContainer === 'not_found' && (
                <span style={{ fontSize: '0.72rem', color: 'hsl(0 70% 60%)', fontWeight: 600 }}>
                  ❌ Container não encontrado
                </span>
              )}
            </div>
            <div style={s.field}>
              <label style={s.label}>Caçamba Entregue</label>
              <input
                style={s.input}
                placeholder="Nº container"
                value={cacambaEntregue}
                onChange={e => setCacambaEntregue(e.target.value)}
                inputMode="text"
              />
            </div>
          </div>

          {/* Observação */}
          <div style={s.field}>
            <label style={s.label}>Observação (opcional)</label>
            <textarea
              style={s.textarea}
              placeholder="Alguma observação..."
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={3}
            />
          </div>

          {erro && <p style={s.erro}>{erro}</p>}

          <button
            type="submit"
            style={{ ...s.btnEnviar, opacity: enviando ? 0.7 : 1 }}
            disabled={enviando}
          >
            {enviando ? 'Enviando...' : '📤 Enviar para aprovação'}
          </button>
        </form>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    background: 'hsl(140 15% 6%)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'hsl(140 14% 9%)',
    borderBottom: '1px solid hsl(140 14% 16%)',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerSub: {
    fontSize: '0.72rem',
    color: 'hsl(140 10% 45%)',
    letterSpacing: '0.04em',
  },
  headerNome: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'hsl(38 92% 60%)',
  },
  btnHeader: {
    background: 'hsl(140 14% 15%)',
    border: '1px solid hsl(140 14% 22%)',
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8rem',
    color: 'hsl(140 10% 70%)',
    cursor: 'pointer',
  },
  btnHeaderLogout: {
    background: 'transparent',
    border: '1px solid hsl(140 14% 20%)',
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8rem',
    color: 'hsl(140 10% 50%)',
    cursor: 'pointer',
  },
  body: {
    flex: 1,
    padding: '1.5rem 1.25rem',
    maxWidth: '480px',
    width: '100%',
    margin: '0 auto',
  },
  formTitulo: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'hsl(140 10% 85%)',
    marginBottom: '1.25rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  row2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  label: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'hsl(140 10% 50%)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    background: 'hsl(140 14% 12%)',
    border: '1px solid hsl(140 14% 20%)',
    borderRadius: '0.75rem',
    color: 'hsl(140 10% 85%)',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    background: 'hsl(140 14% 12%)',
    border: '1px solid hsl(140 14% 20%)',
    borderRadius: '0.75rem',
    color: 'hsl(140 10% 85%)',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  sugestoes: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: 'hsl(140 14% 14%)',
    border: '1px solid hsl(140 14% 22%)',
    borderRadius: '0.75rem',
    zIndex: 20,
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  sugestaoItem: {
    padding: '0.875rem 1rem',
    fontSize: '0.95rem',
    color: 'hsl(140 10% 80%)',
    cursor: 'pointer',
    borderBottom: '1px solid hsl(140 14% 18%)',
  },
  btnEnviar: {
    padding: '1rem',
    fontSize: '1rem',
    fontWeight: 700,
    background: 'hsl(38 92% 50%)',
    color: 'hsl(38 40% 10%)',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
    letterSpacing: '0.02em',
  },
  erro: {
    color: 'hsl(0 70% 60%)',
    fontSize: '0.85rem',
    margin: 0,
  },
  successCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    gap: '0.75rem',
    maxWidth: '360px',
    margin: '0 auto',
  },
  successIcon: {
    fontSize: '3.5rem',
    marginBottom: '0.5rem',
  },
  successTitulo: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'hsl(140 60% 60%)',
    margin: 0,
  },
  successMsg: {
    color: 'hsl(140 10% 55%)',
    fontSize: '0.95rem',
    textAlign: 'center',
    marginBottom: '0.5rem',
  },
  btnPrimary: {
    width: '100%',
    padding: '1rem',
    fontSize: '1rem',
    fontWeight: 700,
    background: 'hsl(38 92% 50%)',
    color: 'hsl(38 40% 10%)',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
  },
  btnSecondary: {
    width: '100%',
    padding: '0.875rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    background: 'hsl(140 14% 14%)',
    color: 'hsl(140 10% 65%)',
    border: '1px solid hsl(140 14% 22%)',
    borderRadius: '0.75rem',
    cursor: 'pointer',
  },
}
