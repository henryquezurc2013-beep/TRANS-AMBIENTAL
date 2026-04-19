import { useEffect, useState, FormEvent } from 'react'
import { db, Container, Cliente, registrarLog } from '../services/dataService'
import Icon from '../components/Icon'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'

const MATERIAIS = ['AÇO', 'FERRO LATA']
const hoje = () => new Date().toISOString().slice(0, 10)

export default function CadastroRapido() {
  const { sessao } = useAuth()
  const toast = useToast()
  const [aba, setAba] = useState<'entrega' | 'retirada'>('entrega')

  const [containers, setContainers] = useState<Container[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)

  // Form entrega
  const [idContainer, setIdContainer] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [material, setMaterial] = useState('')
  const [dataEntrega, setDataEntrega] = useState(hoje())
  const [previsaoRetirada, setPrevisaoRetirada] = useState('')
  const [obsEntrega, setObsEntrega] = useState('')

  // Form retirada
  const [idRetirar, setIdRetirar] = useState('')
  const [dataRetirada, setDataRetirada] = useState(hoje())

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [c, cl] = await Promise.all([db.containers.getAll(), db.clientes.getAll()])
    setContainers(c)
    setClientes(cl)
  }

  const disponiveis = containers.filter(c =>
    c.status_operacional === 'DISPONIVEL' &&
    c.liberado_para_entrega === 'SIM' &&
    c.status_cadastro === 'ATIVO'
  )

  const emUso = containers.filter(c => c.status_operacional === 'EM USO')

  async function handleEntrega(e: FormEvent) {
    e.preventDefault()
    if (!idContainer || !clienteNome || !dataEntrega || !previsaoRetirada) {
      toast('Preencha todos os campos obrigatórios', 'error')
      return
    }
    setLoading(true)
    try {
      const container = containers.find(c => c.id_container === idContainer)!
      const cliente = clientes.find(cl => cl.nome_cliente === clienteNome)!

      await db.controle.add({
        data_lancamento: hoje(),
        id_container: idContainer,
        tipo_container: container.tipo_container,
        cliente: clienteNome,
        contato_cliente: cliente?.contato ?? '',
        telefone_cliente: cliente?.telefone ?? '',
        data_entrega: dataEntrega,
        previsao_retirada: previsaoRetirada,
        data_retirada: null,
        material,
        observacao: obsEntrega,
        origem_acao: 'LANCADO POR APP',
      })

      await db.containers.updateByIdContainer(idContainer, {
        status_operacional: 'EM USO',
        liberado_para_entrega: 'NAO',
      })

      await registrarLog(sessao!.usuarioAtual, 'ENTREGA', `Container ${idContainer} entregue para ${clienteNome}`)
      toast(`Container ${idContainer} entregue para ${clienteNome}!`, 'success')

      setIdContainer('')
      setClienteNome('')
      setMaterial('')
      setDataEntrega(hoje())
      setPrevisaoRetirada('')
      setObsEntrega('')
      await carregar()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao lançar entrega', 'error')
    }
    setLoading(false)
  }

  async function handleRetirada(e: FormEvent) {
    e.preventDefault()
    if (!idRetirar || !dataRetirada) {
      toast('Selecione o container e a data de retirada', 'error')
      return
    }
    setLoading(true)
    try {
      const abertos = await db.controle.getEmAberto()
      const registro = abertos.find(r => r.id_container === idRetirar)
      if (!registro) throw new Error('Registro de entrega não encontrado')

      await db.controle.update(registro.id, { data_retirada: dataRetirada })

      await db.containers.updateByIdContainer(idRetirar, {
        status_operacional: 'DISPONIVEL',
        liberado_para_entrega: 'SIM',
      })

      await registrarLog(sessao!.usuarioAtual, 'RETIRADA', `Container ${idRetirar} retirado do cliente ${registro.cliente}`)
      toast(`Container ${idRetirar} retirado e disponível!`, 'success')
      setIdRetirar('')
      setDataRetirada(hoje())
      await carregar()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao registrar retirada', 'error')
    }
    setLoading(false)
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Cadastro Rápido</h1>
        <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>Lance entregas e retiradas de containers</p>
      </div>

      {/* Abas */}
      <div className="tab-list" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab-trigger${aba === 'entrega' ? ' active' : ''}`} onClick={() => setAba('entrega')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Icon name="truck" size={14} /> Lançar Entrega</span>
        </button>
        <button className={`tab-trigger${aba === 'retirada' ? ' active' : ''}`} onClick={() => setAba('retirada')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Icon name="check_circle" size={14} /> Retirar Container</span>
        </button>
      </div>

      {aba === 'entrega' ? (
        <div className="card" style={{ maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Icon name="plus_circle" size={18} color="var(--primary)" />
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Nova Entrega</h2>
            <span className="badge badge-info" style={{ marginLeft: 'auto' }}>{disponiveis.length} disponíveis</span>
          </div>

          <form onSubmit={handleEntrega} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Container *</label>
                <select className="select-field" value={idContainer} onChange={e => setIdContainer(e.target.value)} required>
                  <option value="">Selecionar...</option>
                  {disponiveis.map(c => (
                    <option key={c.id} value={c.id_container}>{c.id_container} — {c.capacidade}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Material</label>
                <select className="select-field" value={material} onChange={e => setMaterial(e.target.value)}>
                  <option value="">Selecionar...</option>
                  {MATERIAIS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Cliente *</label>
              <select className="select-field" value={clienteNome} onChange={e => setClienteNome(e.target.value)} required>
                <option value="">Selecionar...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.nome_cliente}>{c.nome_cliente}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Data de Entrega *</label>
                <input className="input-field" type="date" value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Previsão de Retirada *</label>
                <input className="input-field" type="date" value={previsaoRetirada} onChange={e => setPrevisaoRetirada(e.target.value)} required />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ marginTop: '0.375rem', padding: '0.25rem 0.625rem', fontSize: '0.75rem', width: '100%' }}
                  onClick={() => {
                    const base = dataEntrega || hoje()
                    const d = new Date(base + 'T00:00:00')
                    d.setDate(d.getDate() + 30)
                    setPrevisaoRetirada(d.toISOString().slice(0, 10))
                  }}
                >
                  +30 dias
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observação</label>
              <input className="input-field" type="text" placeholder="Opcional" value={obsEntrega} onChange={e => setObsEntrega(e.target.value)} />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}>
              {loading ? 'Salvando...' : <><Icon name="plus_circle" size={15} /> Lançar Entrega</>}
            </button>
          </form>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: '480px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Icon name="package" size={18} color="var(--success)" />
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Retirar Container</h2>
            <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>{emUso.length} em uso</span>
          </div>

          <form onSubmit={handleRetirada} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Container em Uso *</label>
              <select className="select-field" value={idRetirar} onChange={e => setIdRetirar(e.target.value)} required>
                <option value="">Selecionar...</option>
                {emUso.map(c => (
                  <option key={c.id} value={c.id_container}>{c.id_container}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Data de Retirada *</label>
              <input className="input-field" type="date" value={dataRetirada} onChange={e => setDataRetirada(e.target.value)} required />
            </div>

            <button type="submit" className="btn-success" disabled={loading}
              style={{ alignSelf: 'flex-start', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, marginTop: '0.25rem' }}>
              {loading ? 'Salvando...' : <><Icon name="check_circle" size={15} /> Confirmar Retirada</>}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
