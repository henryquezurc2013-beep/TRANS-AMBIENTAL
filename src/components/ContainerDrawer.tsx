import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, Controle, Log } from '../services/dataService'
import Icon from './Icon'
import StatusBadge from './StatusBadge'

interface Props {
  controle: Controle | null
  onClose: () => void
}

const hoje = new Date().toISOString().slice(0, 10)

function fmt(d: string | null) {
  if (!d) return '—'
  return d.split('-').reverse().join('/')
}

function iniciais(nome: string) {
  return nome.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')
}

function statusControle(r: Controle): string {
  if (r.data_retirada !== null) return 'DISPONIVEL'
  if (r.container_fixo) return 'FIXO'
  if (r.previsao_retirada && r.previsao_retirada < hoje) return 'ATRASADO'
  return 'EM USO'
}

function corLog(acao: string): string {
  if (acao.includes('ENTREGA'))  return 'var(--success)'
  if (acao.includes('RETIRADA') || acao.includes('TROCA')) return 'var(--warning)'
  if (acao.includes('MANUT'))    return 'hsl(38 85% 52%)'
  return 'var(--fg-dim)'
}

export default function ContainerDrawer({ controle, onClose }: Props) {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  const fechar = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fechar])

  useEffect(() => {
    if (!controle) return
    setLoading(true)
    db.logs.getAll().then(all => {
      setLogs(all.filter(l => l.detalhes.includes(controle.id_container)).slice(0, 12))
      setLoading(false)
    })
  }, [controle])

  if (!controle) return null

  const status = statusControle(controle)

  function botaoContextual() {
    if (status === 'ATRASADO') return (
      <button className="btn-destructive" style={{ flex: 1, justifyContent: 'center' }}
        onClick={() => { controle!.telefone_cliente ? window.open(`tel:${controle!.telefone_cliente}`) : navigate('/cadastro-rapido'); fechar() }}>
        <Icon name="alert" size={14} /> Contatar cliente
      </button>
    )
    if (status === 'EM USO') return (
      <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}
        onClick={() => { navigate('/troca-container'); fechar() }}>
        <Icon name="swap" size={14} /> Trocar container
      </button>
    )
    if (status === 'DISPONIVEL') return (
      <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}
        onClick={() => { navigate('/cadastro-rapido'); fechar() }}>
        <Icon name="truck" size={14} /> Enviar para cliente
      </button>
    )
    if (status === 'MANUTENCAO') return (
      <button className="btn-warning" style={{ flex: 1, justifyContent: 'center' }}
        onClick={() => { navigate('/manutencao'); fechar() }}>
        <Icon name="wrench" size={14} /> Atualizar status
      </button>
    )
    return null
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={fechar} />
      <div className="drawer">
        {/* Header */}
        <div className="drawer-head" style={{ flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--fg)' }}>
                {controle.id_container}
              </span>
              <StatusBadge status={status} />
              {controle.tipo_container && (
                <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>{controle.tipo_container}</span>
              )}
            </div>
            <button className="btn-ghost" style={{ padding: '0.25rem' }} onClick={fechar}>
              <Icon name="x" size={16} />
            </button>
          </div>
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--fg)' }}>{controle.cliente}</div>
            {controle.contato_cliente && (
              <div style={{ fontSize: '0.8rem', color: 'var(--fg-3)', marginTop: '0.125rem' }}>{controle.contato_cliente}</div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {/* Grid datas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Saída', value: fmt(controle.data_entrega) },
              { label: 'Previsão', value: controle.container_fixo ? 'Fixo' : fmt(controle.previsao_retirada) },
              { label: 'Material', value: controle.material || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--card-2)', borderRadius: '0.625rem', padding: '0.75rem', border: '1px solid var(--border-faint)' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg)' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Contato */}
          {(controle.telefone_cliente || controle.contato_cliente) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem', background: 'var(--card-2)', borderRadius: '0.625rem', border: '1px solid var(--border-faint)', marginBottom: '1.25rem' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                background: 'var(--primary-soft)', border: '1px solid var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.75rem', color: 'var(--primary-fg)',
                fontFamily: 'var(--font-mono)',
              }}>
                {iniciais(controle.cliente)}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg)' }}>{controle.contato_cliente || controle.cliente}</div>
                {controle.telefone_cliente && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--fg-3)', marginTop: '0.1rem', fontFamily: 'var(--font-mono)' }}>{controle.telefone_cliente}</div>
                )}
              </div>
            </div>
          )}

          {/* Observação */}
          {controle.observacao && (
            <div style={{ padding: '0.75rem', background: 'hsl(38 85% 52% / 0.06)', borderRadius: '0.5rem', border: '1px solid hsl(38 85% 52% / 0.2)', marginBottom: '1.25rem', fontSize: '0.8125rem', color: 'var(--fg-2)' }}>
              {controle.observacao}
            </div>
          )}

          {/* Histórico */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
              Histórico
            </div>
            {loading ? (
              <div style={{ color: 'var(--fg-dim)', fontSize: '0.8rem' }}>Carregando...</div>
            ) : logs.length === 0 ? (
              <div style={{ color: 'var(--fg-dim)', fontSize: '0.8rem' }}>Nenhum registro de log.</div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '1.25rem' }}>
                <div style={{ position: 'absolute', left: '5px', top: 0, bottom: 0, width: '1px', background: 'var(--border-soft)' }} />
                {logs.map(log => (
                  <div key={log.id} style={{ position: 'relative', paddingBottom: '0.875rem' }}>
                    <div style={{
                      position: 'absolute', left: '-1.15rem', top: '4px',
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: corLog(log.acao), border: '2px solid var(--card)',
                    }} />
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-2)' }}>{log.acao}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--fg-dim)', marginTop: '0.1rem', lineHeight: 1.4 }}>{log.detalhes}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--fg-faint)', marginTop: '0.15rem', fontFamily: 'var(--font-mono)' }}>
                      {new Date(log.data_hora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      {' · '}{log.usuario}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="drawer-foot">
          <button className="btn-ghost" onClick={fechar}>Fechar</button>
          {botaoContextual()}
        </div>
      </div>
    </>
  )
}
