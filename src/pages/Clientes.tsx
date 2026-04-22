import { useEffect, useState, FormEvent } from 'react'
import { db, Cliente, registrarLog } from '../services/dataService'
import Icon from '../components/Icon'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'

const formVazio = { nome_cliente: '', contato: '', telefone: '', endereco: '', bairro_cidade: '', cep: '', observacao: '' }

export default function Clientes() {
  const { sessao } = useAuth()
  const toast = useToast()
  const [clientes,           setClientes]           = useState<Cliente[]>([])
  const [loading,            setLoading]            = useState(true)
  const [modalAberto,        setModalAberto]        = useState(false)
  const [form,               setForm]               = useState(formVazio)
  const [salvando,           setSalvando]           = useState(false)
  const [editandoId,         setEditandoId]         = useState<string | null>(null)
  const [editForm,           setEditForm]           = useState<Partial<Cliente>>({})
  const [busca,              setBusca]              = useState('')
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null)
  const [excluindo,          setExcluindo]          = useState(false)
  const [cep,                setCep]                = useState('')
  const [buscandoCep,        setBuscandoCep]        = useState(false)
  const [erroCep,            setErroCep]            = useState('')
  const [editCep,            setEditCep]            = useState('')
  const [editBuscandoCep,    setEditBuscandoCep]    = useState(false)
  const [editErroCep,        setEditErroCep]        = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const data = await db.clientes.getAll()
    setClientes(data)
    setLoading(false)
  }

  function fecharModal() { setModalAberto(false); setForm(formVazio); setCep(''); setErroCep(''); setBuscandoCep(false) }

  function handleCepChange(valor: string) {
    const digits = valor.replace(/\D/g, '').slice(0, 8)
    const masked = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
    setCep(masked); setErroCep('')
    if (digits.length === 8) buscarCep(digits)
  }

  async function buscarCep(digits: string) {
    setBuscandoCep(true); setErroCep('')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) { setErroCep('CEP não encontrado'); return }
      setForm(f => ({ ...f, endereco: data.logradouro || f.endereco, bairro_cidade: [data.bairro, data.localidade, data.uf].filter(Boolean).join(' / ') }))
    } catch { setErroCep('Erro ao buscar CEP.') }
    finally { setBuscandoCep(false) }
  }

  async function handleNovo(e: FormEvent) {
    e.preventDefault()
    if (!form.nome_cliente.trim()) { toast('Nome do cliente é obrigatório', 'error'); return }
    setSalvando(true)
    try {
      await db.clientes.add({ ...form, cep })
      await registrarLog(sessao!.usuarioAtual, 'CADASTRO CLIENTE', `Cliente "${form.nome_cliente}" cadastrado`)
      toast(`Cliente "${form.nome_cliente}" cadastrado!`, 'success')
      fecharModal(); await carregar()
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Erro ao cadastrar', 'error') }
    setSalvando(false)
  }

  function handleEditCepChange(valor: string) {
    const digits = valor.replace(/\D/g, '').slice(0, 8)
    const masked = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
    setEditCep(masked); setEditErroCep('')
    if (digits.length === 8) buscarEditCep(digits)
  }

  async function buscarEditCep(digits: string) {
    setEditBuscandoCep(true); setEditErroCep('')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) { setEditErroCep('CEP não encontrado'); return }
      setEditForm(f => ({ ...f, endereco: data.logradouro || f.endereco, bairro_cidade: [data.bairro, data.localidade, data.uf].filter(Boolean).join(' / ') }))
    } catch { setEditErroCep('Erro ao buscar CEP.') }
    finally { setEditBuscandoCep(false) }
  }

  async function salvarEdicao(c: Cliente) {
    try {
      await db.clientes.update(c.id, { ...editForm, cep: editCep })
      await registrarLog(sessao!.usuarioAtual, 'EDITAR CLIENTE', `Cliente "${c.nome_cliente}" atualizado`)
      toast('Cliente atualizado!', 'success')
      setEditandoId(null); await carregar()
    } catch { toast('Erro ao salvar', 'error') }
  }

  async function handleExcluir() {
    if (!clienteParaExcluir) return
    setExcluindo(true)
    try {
      const temMov = await db.clientes.temMovimentacoes(clienteParaExcluir.nome_cliente)
      if (temMov) { toast('Não é possível excluir — cliente possui movimentações registradas', 'error'); setClienteParaExcluir(null); setExcluindo(false); return }
      await db.clientes.delete(clienteParaExcluir.id)
      await registrarLog(sessao!.usuarioAtual, 'CLIENTE EXCLUIDO', `Cliente "${clienteParaExcluir.nome_cliente}" excluído`)
      toast('Cliente excluído com sucesso', 'success')
      setClienteParaExcluir(null); await carregar()
    } catch { toast('Erro ao excluir cliente', 'error') }
    setExcluindo(false)
  }

  const filtrado = clientes.filter(c =>
    c.nome_cliente.toLowerCase().includes(busca.toLowerCase()) ||
    c.contato.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca) ||
    c.bairro_cidade.toLowerCase().includes(busca.toLowerCase())
  )

  function inp(val: string, onChange: (v: string) => void, ph = '') {
    return <input className="input-field" style={{ minWidth: '90px' }} value={val} onChange={e => onChange(e.target.value)} placeholder={ph} />
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-soft)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Clientes</h1>
          <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
            {clientes.length} cadastrado{clientes.length !== 1 ? 's' : ''} · {filtrado.length} mostrando
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={13} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', pointerEvents: 'none' }} />
            <input
              className="input-field"
              style={{ paddingLeft: '2rem', width: '220px' }}
              placeholder="Buscar cliente..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => setModalAberto(true)}><Icon name="plus" size={14} /> Novo cliente</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--fg-muted)' }}>Carregando...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Nome</th><th>Contato</th><th>Telefone</th><th>Endereço</th><th>Bairro/Cidade</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {filtrado.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--fg-muted)' }}>
                  {busca ? 'Nenhum resultado' : 'Nenhum cliente cadastrado'}
                </td></tr>
              ) : filtrado.map(c => (
                <tr key={c.id}>
                  {editandoId === c.id ? (
                    <>
                      <td style={{ fontWeight: 500, color: 'var(--fg)' }}>{c.nome_cliente}</td>
                      <td>{inp(editForm.contato ?? '', v => setEditForm(f => ({ ...f, contato: v })), 'Contato')}</td>
                      <td>{inp(editForm.telefone ?? '', v => setEditForm(f => ({ ...f, telefone: v })), 'Telefone')}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ position: 'relative' }}>
                            <input className="input-field" placeholder="CEP (00000-000)" value={editCep} onChange={e => handleEditCepChange(e.target.value)} maxLength={9}
                              style={{ minWidth: '90px', paddingRight: editBuscandoCep ? '2rem' : undefined }} />
                            {editBuscandoCep && <Icon name="loader" size={13} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />}
                          </div>
                          {editErroCep && <span style={{ fontSize: '0.7rem', color: 'var(--destructive)' }}>{editErroCep}</span>}
                          <input className="input-field" style={{ minWidth: '90px' }} placeholder="Endereço" value={editForm.endereco ?? ''} onChange={e => setEditForm(f => ({ ...f, endereco: e.target.value }))} />
                        </div>
                      </td>
                      <td>{inp(editForm.bairro_cidade ?? '', v => setEditForm(f => ({ ...f, bairro_cidade: v })), 'Bairro/Cidade')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn-success" style={{ padding: '0.25rem 0.5rem' }} onClick={() => salvarEdicao(c)}><Icon name="check" size={13} /></button>
                          <button className="btn-destructive" style={{ padding: '0.25rem 0.5rem' }} onClick={() => { setEditandoId(null); setEditCep(''); setEditErroCep('') }}><Icon name="x" size={13} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: 500, color: 'var(--fg)' }}>{c.nome_cliente}</td>
                      <td style={{ fontSize: '0.8rem' }}>{c.contato || '—'}</td>
                      <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--fg-3)' }}>{c.telefone || '—'}</td>
                      <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--fg-3)' }}>{c.endereco || '—'}</td>
                      <td style={{ fontSize: '0.8rem' }}>{c.bairro_cidade || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            className="btn-ghost"
                            style={{ padding: '0.375rem' }}
                            title="Editar"
                            onClick={() => {
                              setEditandoId(c.id)
                              setEditForm({ contato: c.contato, telefone: c.telefone, endereco: c.endereco, bairro_cidade: c.bairro_cidade, observacao: c.observacao })
                              setEditCep(c.cep ?? ''); setEditErroCep('')
                            }}
                          >
                            <Icon name="pencil" size={13} />
                          </button>
                          <button
                            className="btn-ghost"
                            style={{ padding: '0.375rem', color: 'hsl(0,75%,68%)' }}
                            title="Excluir"
                            onClick={() => setClienteParaExcluir(c)}
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal — Novo Cliente */}
      {modalAberto && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) fecharModal() }}>
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 600 }}>Novo Cliente</h2>
              <button className="btn-ghost" style={{ padding: '0.25rem' }} onClick={fecharModal}><Icon name="x" size={17} /></button>
            </div>
            <form onSubmit={handleNovo} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div className="form-group">
                <label className="form-label">Nome do Cliente *</label>
                <input className="input-field" placeholder="Nome completo ou razão social" value={form.nome_cliente} onChange={e => setForm(f => ({ ...f, nome_cliente: e.target.value }))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div className="form-group">
                  <label className="form-label">Contato</label>
                  <input className="input-field" placeholder="Nome do responsável" value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input className="input-field" placeholder="(61) 99999-0000" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.875rem' }}>
                <div className="form-group">
                  <label className="form-label">CEP</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input-field" placeholder="00000-000" value={cep} onChange={e => handleCepChange(e.target.value)} maxLength={9}
                      style={{ paddingRight: buscandoCep ? '2rem' : undefined }} />
                    {buscandoCep && <Icon name="loader" size={13} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />}
                  </div>
                  {erroCep && <span style={{ fontSize: '0.75rem', color: 'var(--destructive)', marginTop: '0.25rem', display: 'block' }}>{erroCep}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Endereço</label>
                  <input className="input-field" placeholder="Rua, número" value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Bairro / Cidade</label>
                <input className="input-field" placeholder="Bairro / Luziânia" value={form.bairro_cidade} onChange={e => setForm(f => ({ ...f, bairro_cidade: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Observação</label>
                <input className="input-field" placeholder="Opcional" value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button type="button" className="btn-secondary" onClick={fecharModal}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : <><Icon name="plus" size={14} /> Cadastrar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog — Confirmar Exclusão */}
      {clienteParaExcluir && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !excluindo) setClienteParaExcluir(null) }}>
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', flexShrink: 0, background: 'hsl(0 84% 60% / 0.12)', border: '1px solid hsl(0 84% 60% / 0.3)', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="alert" size={17} color="var(--destructive)" />
              </div>
              <div>
                <h2 style={{ margin: '0 0 0.375rem', fontSize: '1rem', fontWeight: 600 }}>Excluir cliente</h2>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                  Tem certeza que deseja excluir{' '}
                  <strong style={{ color: 'var(--fg)' }}>{clienteParaExcluir.nome_cliente}</strong>?
                  {' '}Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" disabled={excluindo} onClick={() => setClienteParaExcluir(null)}>Cancelar</button>
              <button className="btn-destructive" disabled={excluindo} style={{ background: 'var(--destructive)', color: 'white', border: 'none' }} onClick={handleExcluir}>
                {excluindo ? 'Excluindo...' : <><Icon name="trash" size={13} /> Excluir</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
