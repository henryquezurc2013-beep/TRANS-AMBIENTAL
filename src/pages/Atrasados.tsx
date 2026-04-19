import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Pencil, Check, X, Printer } from 'lucide-react'
import { db, Controle, registrarLog } from '../services/dataService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import RelatorioAtrasados from '../components/RelatorioAtrasados'

const hoje = () => new Date().toISOString().slice(0, 10)

function diasAtraso(data: string) {
  return Math.floor((new Date(hoje()).getTime() - new Date(data).getTime()) / 86400000)
}

function corAtraso(dias: number) {
  if (dias > 14) return 'var(--destructive)'
  if (dias > 7)  return 'var(--warning)'
  return 'hsl(38, 92%, 65%)'
}

export default function Atrasados() {
  const navigate = useNavigate()
  const { sessao } = useAuth()
  const toast = useToast()
  const [atrasados, setAtrasados] = useState<Controle[]>([])
  const [loading, setLoading] = useState(true)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [novaData, setNovaData] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [relatorioAberto, setRelatorioAberto] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const hj = hoje()
    const data = await db.controle.getEmAberto()
    setAtrasados(
      data
        .filter(c => c.previsao_retirada < hj)
        .sort((a, b) => a.previsao_retirada.localeCompare(b.previsao_retirada))
    )
    setLoading(false)
  }

  function iniciarEdicao(id: string, dataAtual: string) {
    setEditandoId(id)
    setNovaData(dataAtual)
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setNovaData('')
  }

  async function salvarData(c: Controle) {
    if (!novaData) { toast('Selecione uma data', 'error'); return }
    if (novaData <= hoje()) {
      toast('A nova data deve ser maior que hoje', 'error')
      return
    }
    setSalvando(true)
    try {
      await db.controle.update(c.id, { previsao_retirada: novaData })
      await registrarLog(
        sessao!.usuarioAtual,
        'DATA RETIRADA ATUALIZADA',
        `Container ${c.id_container} | Cliente ${c.cliente} | Nova previsão: ${novaData.split('-').reverse().join('/')}`
      )
      toast('Data de retirada atualizada com sucesso', 'success')
      setEditandoId(null)
      setNovaData('')
      await carregar()
    } catch {
      toast('Erro ao atualizar data', 'error')
    }
    setSalvando(false)
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Atrasados</h1>
            {atrasados.length > 0 && <span className="badge badge-destructive">{atrasados.length}</span>}
          </div>
          <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>Containers com retirada em atraso</p>
        </div>
        {atrasados.length > 0 && (
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }} onClick={() => setRelatorioAberto(true)}>
            <Printer size={15} /> Relatório de Atrasados
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--fg-muted)' }}>Carregando...</div>
      ) : atrasados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <AlertTriangle size={40} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>Tudo em dia!</h3>
          <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>Nenhum container com retirada atrasada.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {atrasados.map(c => {
            const dias = diasAtraso(c.previsao_retirada)
            const cor = corAtraso(dias)
            const estaEditando = editandoId === c.id

            return (
              <div key={c.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
                padding: '1rem 1.25rem',
                background: estaEditando ? 'hsl(217 91% 60% / 0.05)' : 'hsl(0 84% 60% / 0.04)',
                border: `1px solid ${estaEditando ? 'hsl(217 91% 60% / 0.3)' : 'hsl(0 84% 60% / 0.18)'}`,
                borderRadius: '0.75rem',
                borderLeft: `3px solid ${estaEditando ? 'var(--primary)' : cor}`,
                transition: 'all 0.15s',
              }}>
                {/* Info principal */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-info">{c.id_container}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{c.cliente}</span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span>Entregue em {c.data_entrega.split('-').reverse().join('/')}</span>
                    <span>·</span>

                    {estaEditando ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <span>Nova prev.:</span>
                        <input
                          type="date"
                          className="input-field"
                          style={{ width: '150px', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                          value={novaData}
                          min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) })()}
                          onChange={e => setNovaData(e.target.value)}
                          autoFocus
                        />
                        <button className="btn-success" style={{ padding: '0.2rem 0.45rem' }} disabled={salvando} onClick={() => salvarData(c)} title="Confirmar">
                          <Check size={13} />
                        </button>
                        <button className="btn-ghost" style={{ padding: '0.2rem 0.45rem' }} disabled={salvando} onClick={cancelarEdicao} title="Cancelar">
                          <X size={13} />
                        </button>
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <span>Prev. {c.previsao_retirada.split('-').reverse().join('/')}</span>
                        <button className="btn-ghost" style={{ padding: '0.125rem 0.3rem', lineHeight: 1 }} onClick={() => iniciarEdicao(c.id, c.previsao_retirada)} title="Editar previsão de retirada">
                          <Pencil size={11} />
                        </button>
                      </span>
                    )}

                    {c.material && <><span>·</span><span>{c.material}</span></>}
                  </div>
                </div>

                {/* Contador de dias + botão Resolver */}
                {!estaEditando && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: cor, lineHeight: 1 }}>{dias}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)' }}>dias</div>
                    </div>
                    <button className="btn-primary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }} onClick={() => navigate('/cadastro-rapido')}>
                      Resolver <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {relatorioAberto && (
        <RelatorioAtrasados atrasados={atrasados} onClose={() => setRelatorioAberto(false)} />
      )}
    </div>
  )
}
