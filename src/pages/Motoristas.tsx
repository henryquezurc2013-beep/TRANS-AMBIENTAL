import { useEffect, useState, FormEvent } from 'react'
import { Plus, Pencil, Check, X, RefreshCw } from 'lucide-react'
import { db, Motorista, registrarLog } from '../services/dataService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'

type StatusFiltro = 'ATIVOS' | 'INATIVOS' | 'TODOS'

const formVazio = { nome: '', ativo: true }

export default function Motoristas() {
  const { sessao } = useAuth()
  const toast = useToast()
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<StatusFiltro>('ATIVOS')
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      const data = await db.motoristas.getAll()
      setMotoristas(data)
    } catch {
      toast('Erro ao carregar motoristas', 'error')
    }
    setLoading(false)
  }

  function abrirNovo() {
    setEditandoId(null)
    setForm(formVazio)
    setModalAberto(true)
  }

  function abrirEdicao(m: Motorista) {
    setEditandoId(m.id)
    setForm({ nome: m.nome, ativo: m.ativo })
    setModalAberto(true)
  }

  function fecharModal() {
    if (salvando) return
    setModalAberto(false)
    setEditandoId(null)
    setForm(formVazio)
  }

  async function handleSalvar(e: FormEvent) {
    e.preventDefault()
    const nome = form.nome.trim()
    if (nome.length < 3) { toast('Nome deve ter pelo menos 3 caracteres', 'error'); return }
    if (nome.length > 120) { toast('Nome não pode passar de 120 caracteres', 'error'); return }

    setSalvando(true)
    try {
      if (editandoId) {
        await db.motoristas.update(editandoId, { nome, ativo: form.ativo })
        await registrarLog(
          sessao!.usuarioAtual,
          'EDICAO MOTORISTA',
          `Motorista "${nome}" · ${form.ativo ? 'ativo' : 'inativo'}`
        )
        toast(`Motorista "${nome}" atualizado`, 'success')
      } else {
        await db.motoristas.add({ nome, ativo: form.ativo })
        await registrarLog(
          sessao!.usuarioAtual,
          'CADASTRO MOTORISTA',
          `Motorista "${nome}" cadastrado · ${form.ativo ? 'ativo' : 'inativo'}`
        )
        toast(`Motorista "${nome}" cadastrado!`, 'success')
      }
      setModalAberto(false)
      setEditandoId(null)
      setForm(formVazio)
      await carregar()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar', 'error')
    }
    setSalvando(false)
  }

  async function handleAlternarStatus(m: Motorista) {
    const acao = m.ativo ? 'Inativar' : 'Reativar'
    const aviso = m.ativo
      ? `Inativar o motorista "${m.nome}"? Ele não conseguirá mais usar o app.`
      : `Reativar o motorista "${m.nome}"? Ele voltará a poder usar o app.`
    if (!window.confirm(aviso)) return

    try {
      await db.motoristas.setAtivo(m.id, !m.ativo)
      await registrarLog(
        sessao!.usuarioAtual,
        m.ativo ? 'INATIVAR MOTORISTA' : 'REATIVAR MOTORISTA',
        `Motorista "${m.nome}" ${m.ativo ? 'inativado' : 'reativado'}`
      )
      toast(`Motorista ${m.ativo ? 'inativado' : 'reativado'}`, 'success')
      await carregar()
    } catch {
      toast(`Erro ao ${acao.toLowerCase()} motorista`, 'error')
    }
  }

  const filtrados = motoristas.filter(m => {
    const okFiltro = filtro === 'TODOS' ||
      (filtro === 'ATIVOS' && m.ativo) ||
      (filtro === 'INATIVOS' && !m.ativo)
    const okBusca = !busca || m.nome.toLowerCase().includes(busca.toLowerCase())
    return okFiltro && okBusca
  })

  const total = motoristas.length
  const ativos = motoristas.filter(m => m.ativo).length

  function fmtData(iso: string) {
    return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Motoristas</h1>
            <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
              {ativos} ativo{ativos !== 1 ? 's' : ''} · {total} total
            </span>
          </div>
          <p style={{ margin: 0, color: 'hsl(210,20%,50%)', fontSize: '0.875rem' }}>
            Cadastro de motoristas que usam o app
          </p>
        </div>
        <button className="btn-primary" onClick={abrirNovo}>
          <Plus size={15} /> Novo motorista
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {([
          { value: 'ATIVOS', label: 'Ativos' },
          { value: 'INATIVOS', label: 'Inativos' },
          { value: 'TODOS', label: 'Todos' },
        ] as const).map(f => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={filtro === f.value ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
          >
            {f.label}
          </button>
        ))}
        <button
          className="btn-secondary"
          style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          onClick={carregar}
          title="Atualizar"
          disabled={loading}
        >
          <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
          Atualizar
        </button>
        <input
          className="input-field"
          style={{ maxWidth: '240px', marginLeft: 'auto' }}
          placeholder="Buscar por nome..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(210,20%,50%)' }}>Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(210,20%,50%)', lineHeight: 1.7 }}>
          Nenhum motorista encontrado.<br />
          <span style={{ fontSize: '0.85rem' }}>Clique em "+ Novo motorista" para começar.</span>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
                <th>Cadastrado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.nome}</td>
                  <td>
                    {m.ativo
                      ? <span className="badge badge-success">Ativo</span>
                      : <span className="badge badge-muted">Inativo</span>
                    }
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'hsl(210,20%,60%)' }}>{fmtData(m.criado_em)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: '0.25rem 0.5rem' }}
                        title="Editar"
                        onClick={() => abrirEdicao(m)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className={m.ativo ? 'btn-destructive' : 'btn-success'}
                        style={{ padding: '0.25rem 0.625rem', fontSize: '0.72rem' }}
                        onClick={() => handleAlternarStatus(m)}
                      >
                        {m.ativo ? 'Inativar' : 'Reativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) fecharModal() }}>
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 600 }}>
                {editandoId ? 'Editar motorista' : 'Novo motorista'}
              </h2>
              <button className="btn-ghost" style={{ padding: '0.25rem' }} onClick={fecharModal} disabled={salvando}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div className="form-group">
                <label className="form-label">Nome *</label>
                <input
                  className="input-field"
                  placeholder="Nome completo do motorista"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  autoFocus
                  required
                  maxLength={120}
                  disabled={salvando}
                />
                <span style={{ fontSize: '0.7rem', color: 'hsl(210,20%,50%)', marginTop: '0.25rem' }}>
                  Mínimo 3 caracteres · será exibido na lista do app
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={form.ativo ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', justifyContent: 'center' }}
                    onClick={() => setForm(f => ({ ...f, ativo: true }))}
                    disabled={salvando}
                  >
                    Ativo
                  </button>
                  <button
                    type="button"
                    className={!form.ativo ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', justifyContent: 'center' }}
                    onClick={() => setForm(f => ({ ...f, ativo: false }))}
                    disabled={salvando}
                  >
                    Inativo
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button type="button" className="btn-secondary" onClick={fecharModal} disabled={salvando}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : <><Check size={14} /> Salvar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
