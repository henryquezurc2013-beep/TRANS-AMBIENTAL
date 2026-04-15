import { useEffect, useState } from 'react'
import { Pencil, X, ArrowRight, Clock } from 'lucide-react'
import { db, Manutencao as IManutencao, registrarLog } from '../services/dataService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'

// ─── Fluxo de status ──────────────────────────────────────────────────────────

const FLUXO: Record<string, string> = {
  PENDENTE:     'EM ANDAMENTO',
  'EM ANDAMENTO': 'CONCLUIDA',
  CONCLUIDA:    'LIBERADO',
}

const STATUS_LABEL: Record<string, string> = {
  PENDENTE:       'Aguardando',
  'EM ANDAMENTO': 'Em Manutenção',
  CONCLUIDA:      'Concluída',
  LIBERADO:       'Disponível',
}

// ─── Histórico (armazenado em JSON dentro do campo observacao) ────────────────

interface HistoriaItem {
  de:   string
  para: string
  data: string   // ISO string
  nota: string
}

interface ObsData {
  obs:      string
  historia: HistoriaItem[]
}

function parseObs(raw: string): ObsData {
  try {
    const p = JSON.parse(raw)
    if (p && typeof p === 'object' && Array.isArray(p.historia)) return p as ObsData
  } catch { /* legado */ }
  return { obs: raw ?? '', historia: [] }
}

function serializeObs(d: ObsData): string {
  return JSON.stringify(d)
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function badgePrioridade(p: string) {
  if (p === 'URGENTE') return <span className="badge badge-destructive">URGENTE</span>
  if (p === 'ALTA')    return <span className="badge badge-warning">ALTA</span>
  if (p === 'MEDIA')   return <span className="badge badge-info">MÉDIA</span>
  return <span className="badge badge-muted">BAIXA</span>
}

function badgeStatus(s: string) {
  if (s === 'PENDENTE')       return <span className="badge badge-muted">Aguardando</span>
  if (s === 'EM ANDAMENTO')   return <span className="badge badge-warning">Em Manutenção</span>
  if (s === 'CONCLUIDA')      return <span className="badge badge-success">Concluída</span>
  if (s === 'LIBERADO')       return <span className="badge badge-info">Disponível</span>
  return <span className="badge badge-muted">{s}</span>
}

function corStatus(s: string): string {
  if (s === 'PENDENTE')       return 'hsl(210,20%,50%)'
  if (s === 'EM ANDAMENTO')   return 'hsl(38,92%,55%)'
  if (s === 'CONCLUIDA')      return 'hsl(142,71%,45%)'
  if (s === 'LIBERADO')       return 'hsl(217,91%,60%)'
  return 'hsl(210,20%,50%)'
}

// ─── Filtros ──────────────────────────────────────────────────────────────────

const FILTROS = ['TODOS', 'PENDENTE', 'EM ANDAMENTO', 'CONCLUIDA', 'LIBERADO'] as const
const LABEL_FILTRO: Record<string, string> = {
  TODOS: 'Todos', PENDENTE: 'Aguardando', 'EM ANDAMENTO': 'Em Manutenção',
  CONCLUIDA: 'Concluídas', LIBERADO: 'Disponíveis',
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Manutencao() {
  const { sessao } = useAuth()
  const toast = useToast()
  const [registros, setRegistros]   = useState<IManutencao[]>([])
  const [loading, setLoading]       = useState(true)
  const [filtro, setFiltro]         = useState('TODOS')
  const [editando, setEditando]     = useState<IManutencao | null>(null)
  const [nota, setNota]             = useState('')
  const [dataHora, setDataHora]     = useState('')
  const [salvando, setSalvando]     = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const data = await db.manutencao.getAll()
    setRegistros(data)
    setLoading(false)
  }

  function abrirEdicao(r: IManutencao) {
    setEditando(r)
    setNota('')
    // data/hora local formatada para datetime-local input
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    setDataHora(
      `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
    )
  }

  function fecharModal() {
    if (salvando) return
    setEditando(null)
  }

  async function avancarStatus() {
    if (!editando) return
    const proximoStatus = FLUXO[editando.status_manutencao]
    if (!proximoStatus) return
    setSalvando(true)
    try {
      const obsAtual   = parseObs(editando.observacao ?? '')
      const novoItem: HistoriaItem = {
        de:   editando.status_manutencao,
        para: proximoStatus,
        data: new Date(dataHora).toISOString(),
        nota: nota.trim(),
      }
      const novaObsData: ObsData = {
        obs:      obsAtual.obs,
        historia: [...obsAtual.historia, novoItem],
      }

      await db.manutencao.update(editando.id, {
        status_manutencao: proximoStatus,
        observacao:        serializeObs(novaObsData),
      })

      // Se liberando, atualiza o container no estoque
      if (proximoStatus === 'LIBERADO') {
        await db.containers.updateByIdContainer(editando.id_container, {
          status_operacional:    'DISPONIVEL',
          liberado_para_entrega: 'SIM',
        })
        await registrarLog(
          sessao!.usuarioAtual,
          'LIBERACAO CONTAINER',
          `Container ${editando.id_container} liberado — retornou ao pátio`,
        )
        toast(`Container ${editando.id_container} disponível no pátio!`, 'success')
      } else {
        await registrarLog(
          sessao!.usuarioAtual,
          'STATUS MANUTENCAO',
          `Container ${editando.id_container}: ${STATUS_LABEL[editando.status_manutencao]} → ${STATUS_LABEL[proximoStatus]}`,
        )
        toast(`Status atualizado: ${STATUS_LABEL[proximoStatus]}`, 'success')
      }

      fecharModal()
      await carregar()
    } catch {
      toast('Erro ao atualizar status', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const filtrado  = filtro === 'TODOS' ? registros : registros.filter(r => r.status_manutencao === filtro)
  const pendentes = registros.filter(r => r.status_manutencao === 'PENDENTE').length

  // ── Dados do modal ─────────────────────────────────────────────────────────
  const proximoStatus = editando ? FLUXO[editando.status_manutencao] : null
  const obsData       = editando ? parseObs(editando.observacao ?? '') : null

  return (
    <div className="page-container">

      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Manutenção</h1>
            {pendentes > 0 && <span className="badge badge-destructive">{pendentes} aguardando</span>}
          </div>
          <p style={{ margin: 0, color: 'hsl(210,20%,50%)', fontSize: '0.875rem' }}>Histórico de manutenções</p>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {FILTROS.map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={filtro === f ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}>
              {LABEL_FILTRO[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(210,20%,50%)' }}>Carregando...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Data</th><th>Container</th><th>Descrição</th><th>Status</th><th>Prioridade</th><th>Responsável</th><th>Custo</th><th></th></tr>
            </thead>
            <tbody>
              {filtrado.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'hsl(210,20%,40%)' }}>Nenhum registro</td></tr>
              ) : filtrado.map(r => (
                <tr key={r.id}>
                  <td style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}>{r.data_lancamento.split('-').reverse().join('/')}</td>
                  <td><span className="badge badge-info">{r.id_container}</span></td>
                  <td style={{ maxWidth: '280px' }}>{r.descricao}</td>
                  <td>{badgeStatus(r.status_manutencao)}</td>
                  <td>{badgePrioridade(r.prioridade)}</td>
                  <td style={{ fontSize: '0.8rem' }}>{r.responsavel || '—'}</td>
                  <td style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}>
                    {r.custo > 0 ? `R$ ${Number(r.custo).toFixed(2)}` : '—'}
                  </td>
                  <td>
                    {FLUXO[r.status_manutencao] && (
                      <button
                        className="btn-ghost"
                        style={{ padding: '0.25rem 0.5rem' }}
                        title={`Avançar para: ${STATUS_LABEL[FLUXO[r.status_manutencao]]}`}
                        onClick={() => abrirEdicao(r)}
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {editando && proximoStatus && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) fecharModal() }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>

            {/* Título */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 600 }}>Atualizar Manutenção</h2>
              <button className="btn-ghost" style={{ padding: '0.25rem' }} onClick={fecharModal} disabled={salvando}><X size={18} /></button>
            </div>

            {/* Info do container */}
            <div style={{
              background: 'hsl(220,25%,11%)',
              border: '1px solid hsl(220,25%,18%)',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.4rem 1rem',
              fontSize: '0.825rem',
            }}>
              <div>
                <span style={{ color: 'hsl(210,20%,45%)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Container</span>
                <div><strong>{editando.id_container}</strong> <span style={{ color: 'hsl(210,20%,55%)' }}>({editando.tipo_container})</span></div>
              </div>
              <div>
                <span style={{ color: 'hsl(210,20%,45%)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Responsável</span>
                <div>{editando.responsavel || '—'}</div>
              </div>
              {editando.descricao && (
                <div style={{ gridColumn: '1 / -1', paddingTop: '0.375rem', borderTop: '1px solid hsl(220,25%,18%)' }}>
                  <span style={{ color: 'hsl(210,20%,45%)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Descrição</span>
                  <div style={{ color: 'hsl(210,20%,75%)' }}>{editando.descricao}</div>
                </div>
              )}
            </div>

            {/* Transição de status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              background: 'hsl(220,25%,11%)',
              border: '1px solid hsl(220,25%,18%)',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'hsl(210,20%,45%)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>Status atual</div>
                <span style={{
                  padding: '0.2rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600,
                  background: `${corStatus(editando.status_manutencao)}20`,
                  color: corStatus(editando.status_manutencao),
                  border: `1px solid ${corStatus(editando.status_manutencao)}50`,
                }}>
                  {STATUS_LABEL[editando.status_manutencao]}
                </span>
              </div>
              <ArrowRight size={18} style={{ color: 'hsl(210,20%,35%)', flexShrink: 0 }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'hsl(210,20%,45%)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>Próximo status</div>
                <span style={{
                  padding: '0.2rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600,
                  background: `${corStatus(proximoStatus)}20`,
                  color: corStatus(proximoStatus),
                  border: `1px solid ${corStatus(proximoStatus)}50`,
                }}>
                  {STATUS_LABEL[proximoStatus]}
                </span>
              </div>
            </div>

            {/* Data/hora da mudança */}
            <div className="form-group" style={{ marginBottom: '0.875rem' }}>
              <label className="form-label">Data e hora da mudança</label>
              <input
                type="datetime-local"
                className="input-field"
                value={dataHora}
                onChange={e => setDataHora(e.target.value)}
                disabled={salvando}
              />
            </div>

            {/* Observação */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">
                Observações <span style={{ color: 'hsl(210,20%,40%)', fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                className="input-field"
                placeholder={
                  proximoStatus === 'EM ANDAMENTO' ? 'Ex: Iniciando troca de componentes...' :
                  proximoStatus === 'CONCLUIDA'    ? 'Ex: Serviço concluído com sucesso...' :
                  'Ex: Container vistoriado e pronto para uso...'
                }
                value={nota}
                onChange={e => setNota(e.target.value)}
                disabled={salvando}
              />
            </div>

            {/* Histórico de mudanças */}
            {obsData && obsData.historia.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'hsl(210,20%,45%)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  Histórico
                </div>
                <div style={{
                  background: 'hsl(220,25%,10%)',
                  border: '1px solid hsl(220,25%,17%)',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                }}>
                  {obsData.historia.map((h, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.625rem',
                      padding: '0.5rem 0.75rem',
                      borderBottom: i < obsData.historia.length - 1 ? '1px solid hsl(220,25%,17%)' : 'none',
                      fontSize: '0.8rem',
                    }}>
                      <Clock size={12} style={{ color: 'hsl(210,20%,40%)', flexShrink: 0, marginTop: '0.15rem' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: h.nota ? '0.15rem' : 0 }}>
                          <span style={{ color: corStatus(h.de), fontWeight: 600 }}>{STATUS_LABEL[h.de] ?? h.de}</span>
                          <ArrowRight size={11} style={{ color: 'hsl(210,20%,35%)' }} />
                          <span style={{ color: corStatus(h.para), fontWeight: 600 }}>{STATUS_LABEL[h.para] ?? h.para}</span>
                          <span style={{ marginLeft: 'auto', color: 'hsl(210,20%,40%)', fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                            {new Date(h.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {h.nota && <div style={{ color: 'hsl(210,20%,55%)', fontSize: '0.75rem' }}>{h.nota}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {proximoStatus === 'LIBERADO' && (
              <p style={{ fontSize: '0.78rem', color: 'hsl(217,91%,65%)', marginBottom: '1rem', lineHeight: 1.5 }}>
                O container será marcado como <strong>Disponível</strong> e voltará ao pátio para novas alocações.
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={fecharModal} disabled={salvando}>Cancelar</button>
              <button className="btn-primary" onClick={avancarStatus} disabled={salvando}>
                {salvando ? 'Salvando...' : `Avançar para ${STATUS_LABEL[proximoStatus]}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
