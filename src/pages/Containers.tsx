import { useEffect, useState, FormEvent } from 'react'
import { Plus, Pencil, Check, X } from 'lucide-react'
import { db, Container, registrarLog } from '../services/dataService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'

const CAPACIDADES = ['PEQUENO', 'MEDIO', 'GRANDE']
const CONSERVACOES = ['BOM', 'REGULAR', 'RUIM']
const PINTURAS = ['PINTADO', 'NAO PINTADO']

interface NovoForm {
  numero_container: string
  capacidade: string
  estado_conservacao: string
  pintura_status: string
  local_patio: string
  material_preferencial: string
  observacao: string
}

const formVazio: NovoForm = {
  numero_container: '', capacidade: 'MEDIO',
  estado_conservacao: 'BOM', pintura_status: 'NAO PINTADO',
  local_patio: '', material_preferencial: '', observacao: '',
}

function statusColor(s: string) {
  if (s === 'EM USO')    return 'var(--primary)'
  if (s === 'DISPONIVEL') return 'var(--success)'
  return 'var(--warning)'
}

export default function Containers() {
  const { sessao } = useAuth()
  const toast = useToast()
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<NovoForm>(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Container>>({})
  const [busca, setBusca] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const data = await db.containers.getAll()
    setContainers(data)
    setLoading(false)
  }

  async function handleNovo(e: FormEvent) {
    e.preventDefault()
    if (!form.numero_container.trim()) {
      toast('Número do container é obrigatório', 'error')
      return
    }
    setSalvando(true)
    try {
      const id_container = form.numero_container.trim()
      await db.containers.add({
        ...form,
        id_container,
        tipo_container: 'Container',
        status_cadastro: 'ATIVO',
        status_operacional: 'DISPONIVEL',
        liberado_para_entrega: 'SIM',
        data_cadastro: new Date().toISOString().slice(0, 10),
      })
      await registrarLog(sessao!.usuarioAtual, 'CADASTRO CONTAINER', `Container ${id_container} cadastrado`)
      toast(`Container ${id_container} cadastrado!`, 'success')
      setModalAberto(false)
      setForm(formVazio)
      await carregar()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao cadastrar', 'error')
    }
    setSalvando(false)
  }

  function iniciarEdicao(c: Container) {
    setEditandoId(c.id)
    setEditForm({
      numero_container: c.numero_container,
      capacidade: c.capacidade,
      estado_conservacao: c.estado_conservacao,
      pintura_status: c.pintura_status,
      local_patio: c.local_patio,
      material_preferencial: c.material_preferencial,
      observacao: c.observacao,
    })
  }

  async function salvarEdicao(c: Container) {
    try {
      await db.containers.update(c.id, editForm)
      await registrarLog(sessao!.usuarioAtual, 'EDITAR CONTAINER', `Container ${c.numero_container} atualizado`)
      toast('Container atualizado!', 'success')
      setEditandoId(null)
      await carregar()
    } catch {
      toast('Erro ao salvar', 'error')
    }
  }

  const filtrado = containers.filter(c =>
    c.numero_container.toLowerCase().includes(busca.toLowerCase()) ||
    c.local_patio.toLowerCase().includes(busca.toLowerCase()) ||
    c.capacidade.toLowerCase().includes(busca.toLowerCase())
  )

  function badgeConservacao(e: string) {
    if (e === 'BOM') return <span className="badge badge-success">Bom</span>
    if (e === 'REGULAR') return <span className="badge badge-warning">Regular</span>
    return <span className="badge badge-destructive">Ruim</span>
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Containers</h1>
          <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>Cadastro e gestão da frota</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input className="input-field" style={{ maxWidth: '220px' }} placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
          <button className="btn-primary" onClick={() => setModalAberto(true)}>
            <Plus size={15} /> Novo Container
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--fg-muted)' }}>Carregando...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nº</th><th>Capacidade</th><th>Status</th>
                <th>Local Pátio</th><th>Conservação</th><th>Pintura</th><th>Material Pref.</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrado.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--fg-muted)' }}>Nenhum container</td></tr>
              ) : filtrado.map(c => (
                <tr key={c.id}>
                  {editandoId === c.id ? (
                    <>
                      <td><input className="input-field" style={{ width: '80px' }} value={editForm.numero_container ?? ''} onChange={e => setEditForm(f => ({ ...f, numero_container: e.target.value }))} /></td>
                      <td>
                        <select className="select-field" style={{ width: '100px' }} value={editForm.capacidade ?? ''} onChange={e => setEditForm(f => ({ ...f, capacidade: e.target.value }))}>
                          {CAPACIDADES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{c.status_operacional}</td>
                      <td><input className="input-field" style={{ width: '120px' }} value={editForm.local_patio ?? ''} onChange={e => setEditForm(f => ({ ...f, local_patio: e.target.value }))} /></td>
                      <td>
                        <select className="select-field" style={{ width: '100px' }} value={editForm.estado_conservacao ?? ''} onChange={e => setEditForm(f => ({ ...f, estado_conservacao: e.target.value }))}>
                          {CONSERVACOES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </td>
                      <td>
                        <select className="select-field" style={{ width: '130px' }} value={editForm.pintura_status ?? ''} onChange={e => setEditForm(f => ({ ...f, pintura_status: e.target.value }))}>
                          {PINTURAS.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </td>
                      <td><input className="input-field" style={{ width: '120px' }} value={editForm.material_preferencial ?? ''} onChange={e => setEditForm(f => ({ ...f, material_preferencial: e.target.value }))} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn-success" style={{ padding: '0.25rem 0.5rem' }} onClick={() => salvarEdicao(c)}><Check size={14} /></button>
                          <button className="btn-destructive" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setEditandoId(null)}><X size={14} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{c.numero_container}</td>
                      <td style={{ fontSize: '0.8rem' }}>{c.capacidade}</td>
                      <td style={{ fontSize: '0.8rem', color: statusColor(c.status_operacional) }}>{c.status_operacional}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{c.local_patio || '—'}</td>
                      <td>{badgeConservacao(c.estado_conservacao)}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{c.pintura_status}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{c.material_preferencial || '—'}</td>
                      <td>
                        <button className="btn-ghost" style={{ padding: '0.25rem 0.5rem' }} onClick={() => iniciarEdicao(c)}>
                          <Pencil size={13} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal novo container */}
      {modalAberto && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalAberto(false) }}>
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 600 }}>Novo Container</h2>
              <button className="btn-ghost" style={{ padding: '0.25rem' }} onClick={() => setModalAberto(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleNovo} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div className="form-group">
                  <label className="form-label">Número *</label>
                  <input className="input-field" placeholder="001" value={form.numero_container} onChange={e => setForm(f => ({ ...f, numero_container: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacidade</label>
                  <select className="select-field" value={form.capacidade} onChange={e => setForm(f => ({ ...f, capacidade: e.target.value }))}>
                    {CAPACIDADES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Conservação</label>
                  <select className="select-field" value={form.estado_conservacao} onChange={e => setForm(f => ({ ...f, estado_conservacao: e.target.value }))}>
                    {CONSERVACOES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Pintura</label>
                  <select className="select-field" value={form.pintura_status} onChange={e => setForm(f => ({ ...f, pintura_status: e.target.value }))}>
                    {PINTURAS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Local no Pátio</label>
                  <input className="input-field" placeholder="Pátio A" value={form.local_patio} onChange={e => setForm(f => ({ ...f, local_patio: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Material Preferencial</label>
                <input className="input-field" placeholder="Opcional" value={form.material_preferencial} onChange={e => setForm(f => ({ ...f, material_preferencial: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Observação</label>
                <input className="input-field" placeholder="Opcional" value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalAberto(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : <><Plus size={14} /> Cadastrar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
