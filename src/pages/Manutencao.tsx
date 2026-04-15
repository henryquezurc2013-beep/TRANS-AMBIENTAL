import { useEffect, useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { db, Manutencao as IManutencao, registrarLog } from '../services/dataService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'

function badgePrioridade(p: string) {
  if (p === 'URGENTE') return <span className="badge badge-destructive">URGENTE</span>
  if (p === 'ALTA') return <span className="badge badge-warning">ALTA</span>
  if (p === 'MEDIA') return <span className="badge badge-info">MÉDIA</span>
  return <span className="badge badge-muted">BAIXA</span>
}

function badgeStatus(s: string) {
  if (s === 'PENDENTE')     return <span className="badge badge-destructive">Pendente</span>
  if (s === 'EM ANDAMENTO') return <span className="badge badge-warning">Em andamento</span>
  if (s === 'LIBERADO')     return <span className="badge badge-info">Liberado</span>
  return <span className="badge badge-success">Concluída</span>
}

const FILTROS = ['TODOS', 'PENDENTE', 'EM ANDAMENTO', 'CONCLUIDA', 'LIBERADO'] as const
const LABEL_FILTRO: Record<string, string> = {
  TODOS: 'Todos', PENDENTE: 'Pendentes', 'EM ANDAMENTO': 'Em andamento',
  CONCLUIDA: 'Concluídas', LIBERADO: 'Liberados',
}

interface EditForm {
  observacao: string
  status: 'EM ANDAMENTO' | 'CONCLUIDA' | 'LIBERADO'
  data_conclusao: string
}

export default function Manutencao() {
  const { sessao } = useAuth()
  const toast = useToast()
  const [registros, setRegistros] = useState<IManutencao[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('TODOS')
  const [editando, setEditando] = useState<IManutencao | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ observacao: '', status: 'CONCLUIDA', data_conclusao: '' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const data = await db.manutencao.getAll()
    setRegistros(data)
    setLoading(false)
  }

  function abrirEdicao(r: IManutencao) {
    setEditando(r)
    setEditForm({
      observacao: r.observacao ?? '',
      status: 'CONCLUIDA',
      data_conclusao: new Date().toISOString().split('T')[0],
    })
  }

  function fecharModal() {
    if (salvando) return
    setEditando(null)
  }

  async function salvar() {
    if (!editando) return
    setSalvando(true)
    try {
      const liberando = editForm.status === 'LIBERADO'

      const agora = new Date().toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })

      let novaObs = editForm.observacao
      if (liberando) {
        novaObs = [novaObs, `[Liberado em ${agora}]`].filter(Boolean).join(' | ')
      }

      await db.manutencao.update(editando.id, {
        status_manutencao: editForm.status,
        observacao: novaObs,
      })

      if (liberando) {
        await db.containers.updateByIdContainer(editando.id_container, {
          status_operacional: 'DISPONIVEL',
          liberado_para_entrega: 'SIM',
        })
        await registrarLog(
          sessao!.usuarioAtual,
          'LIBERACAO CONTAINER',
          `Container ${editando.id_container} liberado após manutenção (ID: ${editando.id})`,
        )
        toast(`Container ${editando.id_container} liberado e disponível!`, 'success')
      } else {
        await registrarLog(
          sessao!.usuarioAtual,
          'EDITAR MANUTENCAO',
          `Manutenção do container ${editando.id_container} atualizada — Status: ${editForm.status}`,
        )
        toast('Manutenção atualizada com sucesso!', 'success')
      }

      fecharModal()
      await carregar()
    } catch {
      toast('Erro ao salvar alterações', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const filtrado = filtro === 'TODOS' ? registros : registros.filter(r => r.status_manutencao === filtro)
  const pendentes = registros.filter(r => r.status_manutencao === 'PENDENTE').length

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Manutenção</h1>
            {pendentes > 0 && <span className="badge badge-destructive">{pendentes} pendentes</span>}
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
                    {r.status_manutencao === 'CONCLUIDA' && (
                      <button
                        className="btn-ghost"
                        style={{ padding: '0.25rem 0.5rem' }}
                        title="Editar / Liberar container"
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

      {/* Modal — Edição / Liberação */}
      {editando && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) fecharModal() }}>
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 600 }}>Editar Manutenção</h2>
              <button className="btn-ghost" style={{ padding: '0.25rem' }} onClick={fecharModal} disabled={salvando}>
                <X size={18} />
              </button>
            </div>

            {/* Informações do registro */}
            <div style={{
              background: 'hsl(220,25%,11%)',
              border: '1px solid hsl(220,25%,18%)',
              borderRadius: '0.5rem',
              padding: '0.875rem 1rem',
              marginBottom: '1rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem 1rem',
              fontSize: '0.825rem',
            }}>
              <div>
                <div style={{ color: 'hsl(210,20%,50%)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>Container</div>
                <strong>{editando.id_container}</strong> <span style={{ color: 'hsl(210,20%,55%)' }}>({editando.tipo_container})</span>
              </div>
              <div>
                <div style={{ color: 'hsl(210,20%,50%)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>Responsável</div>
                <span>{editando.responsavel || '—'}</span>
              </div>
              <div>
                <div style={{ color: 'hsl(210,20%,50%)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>Entrada na manutenção</div>
                <span>{editando.data_lancamento.split('-').reverse().join('/')}</span>
              </div>
              <div>
                <div style={{ color: 'hsl(210,20%,50%)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>Data de conclusão</div>
                <input
                  type="date"
                  className="input-field"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                  value={editForm.data_conclusao}
                  onChange={e => setEditForm(f => ({ ...f, data_conclusao: e.target.value }))}
                  disabled={salvando}
                />
              </div>
              {editando.descricao && (
                <div style={{ gridColumn: '1 / -1', paddingTop: '0.375rem', borderTop: '1px solid hsl(220,25%,18%)' }}>
                  <div style={{ color: 'hsl(210,20%,50%)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>Tipo / Descrição</div>
                  <span style={{ color: 'hsl(210,20%,75%)' }}>{editando.descricao}</span>
                </div>
              )}
            </div>

            {/* Observações */}
            <div className="form-group" style={{ marginBottom: '0.875rem' }}>
              <label className="form-label">Observações</label>
              <input
                className="input-field"
                placeholder="Detalhes da conclusão ou liberação..."
                value={editForm.observacao}
                onChange={e => setEditForm(f => ({ ...f, observacao: e.target.value }))}
                disabled={salvando}
              />
            </div>

            {/* Status */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Status</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {([
                  { value: 'EM ANDAMENTO', label: 'Em Manutenção' },
                  { value: 'CONCLUIDA',    label: 'Concluída' },
                  { value: 'LIBERADO',     label: 'Disponível' },
                ] as const).map(op => (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => setEditForm(f => ({ ...f, status: op.value }))}
                    disabled={salvando}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: editForm.status === op.value ? 600 : 400,
                      borderRadius: '0.5rem',
                      border: `1px solid ${editForm.status === op.value
                        ? op.value === 'LIBERADO' ? 'hsl(142,71%,45%)' : op.value === 'CONCLUIDA' ? 'hsl(217,91%,60%)' : 'hsl(38,92%,50%)'
                        : 'hsl(220,25%,20%)'}`,
                      background: editForm.status === op.value
                        ? op.value === 'LIBERADO' ? 'hsl(142,71%,45%,0.15)' : op.value === 'CONCLUIDA' ? 'hsl(217,91%,60%,0.15)' : 'hsl(38,92%,50%,0.15)'
                        : 'transparent',
                      color: editForm.status === op.value
                        ? op.value === 'LIBERADO' ? 'hsl(142,71%,55%)' : op.value === 'CONCLUIDA' ? 'hsl(217,91%,70%)' : 'hsl(38,92%,60%)'
                        : 'hsl(210,20%,55%)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
              {editForm.status === 'LIBERADO' && (
                <p style={{ fontSize: '0.775rem', color: 'hsl(142,71%,50%)', marginTop: '0.5rem' }}>
                  O container será marcado como disponível e liberado para novas alocações.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={fecharModal} disabled={salvando}>Cancelar</button>
              <button className="btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
