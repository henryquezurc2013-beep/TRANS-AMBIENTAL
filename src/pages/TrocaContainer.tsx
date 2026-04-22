import { useEffect, useState, FormEvent } from 'react'
import { db, Container, registrarLog } from '../services/dataService'
import Icon from '../components/Icon'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'

const hoje = () => new Date().toISOString().slice(0, 10)

export default function TrocaContainer() {
  const { sessao } = useAuth()
  const toast = useToast()
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(false)

  const [containerAntigo, setContainerAntigo] = useState('')
  const [containerNovo, setContainerNovo] = useState('')
  const [dataTroca, setDataTroca] = useState(hoje())
  const [material, setMaterial] = useState('')
  const [obs, setObs] = useState('')

  useEffect(() => {
    db.containers.getAll().then(setContainers)
  }, [])

  const emUso = containers.filter(c => c.status_operacional === 'EM USO')
  const disponiveis = containers.filter(c =>
    c.status_operacional === 'DISPONIVEL' &&
    c.liberado_para_entrega === 'SIM' &&
    c.status_cadastro === 'ATIVO'
  )

  async function handleTroca(e: FormEvent) {
    e.preventDefault()
    if (!containerAntigo || !containerNovo || !dataTroca) {
      toast('Preencha todos os campos obrigatórios', 'error')
      return
    }
    if (containerAntigo === containerNovo) {
      toast('Container antigo e novo devem ser diferentes', 'error')
      return
    }
    setLoading(true)
    try {
      // Busca registro aberto do container antigo
      const abertos = await db.controle.getEmAberto()
      const registroAntigo = abertos.find(r => r.id_container === containerAntigo)
      if (!registroAntigo) throw new Error('Registro de entrega do container antigo não encontrado')

      const clienteNome = registroAntigo.cliente

      // 1. Fecha entrega antiga
      await db.controle.update(registroAntigo.id, {
        data_retirada: dataTroca,
        origem_acao: 'TROCA - RETORNOU AO PATIO',
      })

      // 2. Cria nova entrega com container novo
      const contNovo = containers.find(c => c.id_container === containerNovo)!
      await db.controle.add({
        data_lancamento: hoje(),
        id_container: containerNovo,
        tipo_container: contNovo.tipo_container,
        cliente: clienteNome,
        contato_cliente: registroAntigo.contato_cliente,
        telefone_cliente: registroAntigo.telefone_cliente,
        data_entrega: dataTroca,
        previsao_retirada: registroAntigo.previsao_retirada,
        data_retirada: null,
        material: material || registroAntigo.material,
        observacao: obs,
        origem_acao: 'TROCA - NOVO CONTAINER NO CLIENTE',
        container_fixo: registroAntigo.container_fixo ?? false,
      })

      // 3. Atualiza container antigo → DISPONIVEL
      await db.containers.updateByIdContainer(containerAntigo, {
        status_operacional: 'DISPONIVEL',
        liberado_para_entrega: 'SIM',
      })

      // 4. Atualiza container novo → EM USO
      await db.containers.updateByIdContainer(containerNovo, {
        status_operacional: 'EM USO',
        liberado_para_entrega: 'NAO',
      })

      await registrarLog(sessao!.usuarioAtual, 'TROCA CONTAINER',
        `Container ${containerAntigo} trocado por ${containerNovo} no cliente ${clienteNome}`)

      toast(`Troca realizada! ${containerAntigo} → ${containerNovo} para ${clienteNome}`, 'success')
      setContainerAntigo('')
      setContainerNovo('')
      setDataTroca(hoje())
      setMaterial('')
      setObs('')
      const c = await db.containers.getAll()
      setContainers(c)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao realizar troca', 'error')
    }
    setLoading(false)
  }

  // Info do container antigo selecionado
  const infoAntigo = containerAntigo ? containers.find(c => c.id_container === containerAntigo) : null
  const registroAntigo = infoAntigo ? null : null // será carregado no submit

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Troca de Container</h1>
        <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>Substitua um container em uso por outro disponível</p>
      </div>

      <div className="card" style={{ maxWidth: '580px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Icon name="swap" size={18} color="var(--primary)" />
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Dados da Troca</h2>
        </div>

        <form onSubmit={handleTroca} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label">Container Antigo (em uso) *</label>
              <select className="select-field" value={containerAntigo} onChange={e => setContainerAntigo(e.target.value)} required>
                <option value="">Selecionar...</option>
                {emUso.map(c => <option key={c.id} value={c.id_container}>{c.id_container}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '0.125rem' }}>
              <Icon name="swap" size={20} color="var(--fg-muted)" />
            </div>
            <div className="form-group">
              <label className="form-label">Container Novo (disponível) *</label>
              <select className="select-field" value={containerNovo} onChange={e => setContainerNovo(e.target.value)} required>
                <option value="">Selecionar...</option>
                {disponiveis.map(c => <option key={c.id} value={c.id_container}>{c.id_container} — {c.capacidade}</option>)}
              </select>
            </div>
          </div>

          {containerAntigo && (
            <div style={{ background: 'hsl(217 91% 60% / 0.06)', border: '1px solid hsl(217 91% 60% / 0.15)', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--fg-muted)' }}>
              O cliente atual do container <strong style={{ color: 'var(--primary)' }}>{containerAntigo}</strong> será mantido na nova entrega.
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Data da Troca *</label>
            <input className="input-field" type="date" value={dataTroca} onChange={e => setDataTroca(e.target.value)} required style={{ maxWidth: '200px' }} />
          </div>

          <div className="form-group">
            <label className="form-label">Material (opcional — mantém o anterior se vazio)</label>
            <input className="input-field" placeholder="Ex: Metal" value={material} onChange={e => setMaterial(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Observação</label>
            <input className="input-field" placeholder="Motivo da troca, etc." value={obs} onChange={e => setObs(e.target.value)} />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}>
            {loading ? 'Processando...' : <><Icon name="swap" size={15} /> Realizar Troca</>}
          </button>
        </form>
      </div>
    </div>
  )
}
