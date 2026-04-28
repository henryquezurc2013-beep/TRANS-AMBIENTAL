import { useEffect, useState, FormEvent } from 'react'
import { Plus, Pencil, Check, X, AlertTriangle, RefreshCw } from 'lucide-react'
import { db, Usuario, registrarLog } from '../services/dataService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'

type StatusFiltro = 'ATIVOS' | 'INATIVOS' | 'TODOS'

const formVazio = { usuario: '', senha: '', ativo: 'SIM' as 'SIM' | 'NAO' }

export default function Motoristas() {
  const { sessao } = useAuth()
  const toast = useToast()
  const [motoristas, setMotoristas] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<StatusFiltro>('ATIVOS')
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [confirmacao, setConfirmacao] = useState<Usuario | null>(null)
  const [processando, setProcessando] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      const data = await db.usuarios.getMotoristas()
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

  function abrirEdicao(m: Usuario) {
    setEditandoId(m.id)
    setForm({ usuario: m.usuario, senha: '', ativo: m.ativo === 'SIM' ? 'SIM' : 'NAO' })
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
    const login = form.usuario.trim()
    if (login.length < 4) { toast('Login deve ter pelo menos 4 caracteres', 'error'); return }
    if (!/^[a-zA-Z0-9_-]+$/.test(login)) {
      toast('Login só pode conter letras, números, _ e -', 'error'); return
    }
    if (!editandoId && form.senha.length < 4) {
      toast('Senha deve ter pelo menos 4 caracteres', 'error'); return
    }
    if (editandoId && form.senha && form.senha.length < 4) {
      toast('Nova senha deve ter pelo menos 4 caracteres', 'error'); return
    }

    setSalvando(true)
    try {
      if (editandoId) {
        const payload: Partial<Usuario> = { usuario: login, ativo: form.ativo }
        if (form.senha) payload.senha = form.senha
        await db.usuarios.update(editandoId, payload)
        await registrarLog(
          sessao!.usuarioAtual,
          'EDICAO MOTORISTA',
          `Motorista "${login}" atualizado · ${form.ativo === 'SIM' ? 'ativo' : 'inativo'}`
        )
        toast(`Motorista "${login}" atualizado`, 'success')
      } else {
        await db.usuarios.add({
          usuario: login,
          senha: form.senha,
          nivel: 'MOTORISTA',
          ativo: form.ativo,
        })
        await registrarLog(
          sessao!.usuarioAtual,
          'CADASTRO MOTORISTA',
          `Motorista "${login}" cadastrado · ${form.ativo === 'SIM' ? 'ativo' : 'inativo'}`
        )
        toast(`Motorista "${login}" cadastrado!`, 'success')
      }
      setModalAberto(false)
      setEditandoId(null)
      setForm(formVazio)
      await carregar()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar'
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
        toast('Já existe um usuário com esse login', 'error')
      } else {
        toast(msg, 'error')
      }
    }
    setSalvando(false)
  }

  async function handleAlterarStatus() {
    if (!confirmacao) return
    setProcessando(true)
    const novoStatus: 'SIM' | 'NAO' = confirmacao.ativo === 'SIM' ? 'NAO' : 'SIM'
    try {
      await db.usuarios.setAtivo(confirmacao.id, novoStatus)
      await registrarLog(
        sessao!.usuarioAtual,
        novoStatus === 'NAO' ? 'INATIVAR MOTORISTA' : 'REATIVAR MOTORISTA',
        `Motorista "${confirmacao.usuario}" ${novoStatus === 'NAO' ? 'inativado' : 'reativado'}`
      )
      toast(`Motorista ${novoStatus === 'NAO' ? 'inativado' : 'reativado'}`, 'success')
      setConfirmacao(null)
      await carregar()
    } catch {
      toast('Erro ao alterar status', 'error')
    }
    setProcessando(false)
  }

  const filtrados = motoristas.filter(m => {
    const okFiltro = filtro === 'TODOS' ||
      (filtro === 'ATIVOS' && m.ativo === 'SIM') ||
      (filtro === 'INATIVOS' && m.ativo !== 'SIM')
    const okBusca = !busca || m.usuario.toLowerCase().includes(busca.toLowerCase())
    return okFiltro && okBusca
  })

  const ativos = motoristas.filter(m => m.ativo === 'SIM').length

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
              {ativos} motorista{ativos !== 1 ? 's' : ''} ativo{ativos !== 1 ? 's' : ''}
            </span>
          </div>
          <p style={{ margin: 0, color: 'hsl(210,20%,50%)', fontSize: '0.875rem' }}>
            Usuários do app de motoristas
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
          placeholder="Buscar login..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(210,20%,50%)' }}>Carregando...</div>
      ) : motoristas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(210,20%,50%)', lineHeight: 1.7 }}>
          Nenhum motorista cadastrado ainda.<br />
          <span style={{ fontSize: '0.85rem' }}>Clique em "+ Novo motorista" para começar.</span>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Login</th>
                <th>Status</th>
                <th>Cadastrado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'hsl(210,20%,40%)' }}>
                    Nenhum motorista corresponde aos filtros
                  </td>
                </tr>
              ) : filtrados.map(m => (
                <tr key={m.id}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{m.usuario}</td>
                  <td>
                    {m.ativo === 'SIM'
                      ? <span className="badge badge-success">Ativo</span>
                      : <span className="badge badge-destructive">Inativo</span>
                    }
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'hsl(210,20%,60%)' }}>{fmtData(m.created_at)}</td>
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
                        className={m.ativo === 'SIM' ? 'btn-destructive' : 'btn-success'}
                        style={{ padding: '0.25rem 0.625rem', fontSize: '0.72rem' }}
                        onClick={() => setConfirmacao(m)}
                      >
                        {m.ativo === 'SIM' ? 'Inativar' : 'Reativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal — Novo / Editar */}
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
                <label className="form-label">Login *</label>
                <input
                  className="input-field"
                  placeholder="Ex: joao.silva"
                  value={form.usuario}
                  onChange={e => setForm(f => ({ ...f, usuario: e.target.value.replace(/\s/g, '') }))}
                  autoFocus
                  required
                  disabled={salvando}
                />
                <span style={{ fontSize: '0.7rem', color: 'hsl(210,20%,50%)', marginTop: '0.25rem' }}>
                  Mínimo 4 caracteres · letras, números, _ ou -
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">{editandoId ? 'Nova senha' : 'Senha *'}</label>
                <input
                  className="input-field"
                  type="password"
                  placeholder={editandoId ? 'Deixe em branco para manter' : 'Mínimo 4 caracteres'}
                  value={form.senha}
                  onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                  required={!editandoId}
                  disabled={salvando}
                />
                {editandoId && (
                  <span style={{ fontSize: '0.7rem', color: 'hsl(210,20%,50%)', marginTop: '0.25rem' }}>
                    Deixe em branco para manter a senha atual
                  </span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={form.ativo === 'SIM' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', justifyContent: 'center' }}
                    onClick={() => setForm(f => ({ ...f, ativo: 'SIM' }))}
                    disabled={salvando}
                  >
                    Ativo
                  </button>
                  <button
                    type="button"
                    className={form.ativo === 'NAO' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', justifyContent: 'center' }}
                    onClick={() => setForm(f => ({ ...f, ativo: 'NAO' }))}
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

      {/* Modal — Confirmar inativar/reativar */}
      {confirmacao && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !processando) setConfirmacao(null) }}>
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '2.5rem', height: '2.5rem', flexShrink: 0,
                background: confirmacao.ativo === 'SIM' ? 'hsl(0 84% 60% / 0.12)' : 'hsl(142 60% 45% / 0.12)',
                border: `1px solid ${confirmacao.ativo === 'SIM' ? 'hsl(0 84% 60% / 0.3)' : 'hsl(142 60% 45% / 0.3)'}`,
                borderRadius: '0.625rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle
                  size={18}
                  color={confirmacao.ativo === 'SIM' ? 'hsl(0,84%,60%)' : 'hsl(142,60%,55%)'}
                />
              </div>
              <div>
                <h2 style={{ margin: '0 0 0.375rem', fontSize: '1rem', fontWeight: 600 }}>
                  {confirmacao.ativo === 'SIM' ? 'Inativar motorista' : 'Reativar motorista'}
                </h2>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'hsl(210,20%,60%)', lineHeight: 1.5 }}>
                  {confirmacao.ativo === 'SIM' ? (
                    <>O motorista <strong style={{ color: 'hsl(210,20%,90%)' }}>{confirmacao.usuario}</strong> não poderá mais entrar no app. O cadastro será mantido para histórico.</>
                  ) : (
                    <>O motorista <strong style={{ color: 'hsl(210,20%,90%)' }}>{confirmacao.usuario}</strong> voltará a poder usar o app.</>
                  )}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" disabled={processando} onClick={() => setConfirmacao(null)}>
                Cancelar
              </button>
              <button
                className={confirmacao.ativo === 'SIM' ? 'btn-destructive' : 'btn-success'}
                disabled={processando}
                onClick={handleAlterarStatus}
              >
                {processando
                  ? 'Processando...'
                  : confirmacao.ativo === 'SIM' ? 'Inativar' : 'Reativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
