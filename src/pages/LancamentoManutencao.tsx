import { useEffect, useState, FormEvent } from 'react'
import { Wrench } from 'lucide-react'
import { db, Container, registrarLog } from '../services/dataService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'

const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']
const hoje = () => new Date().toISOString().slice(0, 10)

export default function LancamentoManutencao() {
  const { sessao } = useAuth()
  const toast = useToast()
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(false)

  const [idContainer, setIdContainer] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState('MEDIA')
  const [responsavel, setResponsavel] = useState('')
  const [custo, setCusto] = useState('')
  const [obs, setObs] = useState('')
  const [enviarManutencao, setEnviarManutencao] = useState(true)

  useEffect(() => { db.containers.getAll().then(setContainers) }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!idContainer || !descricao.trim()) {
      toast('Container e descrição são obrigatórios', 'error')
      return
    }
    setLoading(true)
    try {
      const container = containers.find(c => c.id_container === idContainer)!

      await db.manutencao.add({
        data_lancamento: hoje(),
        id_container: idContainer,
        tipo_container: container.tipo_container,
        descricao,
        status_manutencao: 'PENDENTE',
        prioridade,
        responsavel,
        custo: custo ? parseFloat(custo.replace(',', '.')) : 0,
        observacao: obs,
      })

      if (enviarManutencao) {
        await db.containers.updateByIdContainer(idContainer, {
          status_operacional: 'MANUTENCAO',
          liberado_para_entrega: 'NAO',
        })
      }

      await registrarLog(sessao!.usuarioAtual, 'LANÇAMENTO MANUTENÇÃO',
        `Container ${idContainer} — ${descricao} (${prioridade})`)

      toast(`Manutenção lançada para ${idContainer}!`, 'success')
      setIdContainer('')
      setDescricao('')
      setPrioridade('MEDIA')
      setResponsavel('')
      setCusto('')
      setObs('')
      const c = await db.containers.getAll()
      setContainers(c)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao lançar', 'error')
    }
    setLoading(false)
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Lançar Manutenção</h1>
        <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>Registre uma nova ocorrência de manutenção</p>
      </div>

      <div className="card" style={{ maxWidth: '580px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Wrench size={18} color="var(--warning)" />
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Nova Ocorrência</h2>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Container *</label>
              <select className="select-field" value={idContainer} onChange={e => setIdContainer(e.target.value)} required>
                <option value="">Selecionar...</option>
                {containers.map(c => (
                  <option key={c.id} value={c.id_container}>{c.id_container} ({c.status_operacional})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Prioridade</label>
              <select className="select-field" value={prioridade} onChange={e => setPrioridade(e.target.value)}>
                {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descrição do Problema *</label>
            <textarea
              className="input-field"
              placeholder="Descreva o problema ou serviço necessário..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Responsável</label>
              <input className="input-field" placeholder="Nome do técnico" value={responsavel} onChange={e => setResponsavel(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Custo Estimado (R$)</label>
              <input className="input-field" placeholder="0,00" value={custo} onChange={e => setCusto(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Observação</label>
            <input className="input-field" placeholder="Informações adicionais" value={obs} onChange={e => setObs(e.target.value)} />
          </div>

          {/* Toggle bloquear container */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer',
            padding: '0.75rem',
            background: 'hsl(38 92% 50% / 0.06)',
            border: '1px solid hsl(38 92% 50% / 0.2)',
            borderRadius: '0.5rem',
          }}>
            <input
              type="checkbox"
              checked={enviarManutencao}
              onChange={e => setEnviarManutencao(e.target.checked)}
              style={{ width: '1rem', height: '1rem', accentColor: 'var(--warning)' }}
            />
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Bloquear container para manutenção</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>Status será alterado para MANUTENÇÃO e não aparecerá nas entregas</div>
            </div>
          </label>

          <button type="submit" className="btn-warning" disabled={loading} style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}>
            {loading ? 'Salvando...' : <><Wrench size={15} /> Lançar Manutenção</>}
          </button>
        </form>
      </div>
    </div>
  )
}
