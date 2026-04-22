import { useEffect, useState } from 'react'
import { supabase, type TrocaPendente } from '../lib/supabase'

interface Props {
  motoristaId: string
  onVoltar: () => void
}

const STATUS_CONFIG = {
  PENDENTE:  { label: '🟡 PENDENTE',  cor: 'hsl(38 80% 55%)',   bg: 'hsl(38 80% 20%)' },
  APROVADO:  { label: '✅ APROVADO',  cor: 'hsl(140 60% 55%)',  bg: 'hsl(140 40% 14%)' },
  REJEITADO: { label: '❌ REJEITADO', cor: 'hsl(0 70% 58%)',    bg: 'hsl(0 50% 14%)' },
}

function formatarData(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function MinhasTrocas({ motoristaId, onVoltar }: Props) {
  const [trocas, setTrocas] = useState<TrocaPendente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('trocas_pendentes')
      .select('*')
      .eq('motorista_id', motoristaId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setTrocas(data as TrocaPendente[])
        setLoading(false)
      })
  }, [motoristaId])

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.btnVoltar} onClick={onVoltar}>← Voltar</button>
        <div style={s.headerTitulo}>Minhas Trocas</div>
        <div style={{ width: '60px' }} />
      </div>

      <div style={s.body}>
        {loading ? (
          <div style={s.empty}>Carregando...</div>
        ) : trocas.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
            <div>Nenhuma troca enviada ainda.</div>
          </div>
        ) : (
          <div style={s.lista}>
            {trocas.map(t => {
              const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.PENDENTE
              return (
                <div key={t.id} style={s.card}>
                  <div style={s.cardHeader}>
                    <div style={s.cardCliente}>{t.cliente}</div>
                    <span style={{ ...s.badge, color: cfg.cor, background: cfg.bg }}>
                      {cfg.label}
                    </span>
                  </div>

                  <div style={s.cacambas}>
                    <div style={s.cacambaBox}>
                      <div style={s.cacambaLabel}>Retirada</div>
                      <div style={s.cacambaNum}>{t.cacamba_retirada}</div>
                    </div>
                    <div style={s.seta}>→</div>
                    <div style={s.cacambaBox}>
                      <div style={s.cacambaLabel}>Entregue</div>
                      <div style={s.cacambaNum}>{t.cacamba_entregue}</div>
                    </div>
                  </div>

                  <div style={s.cardFooter}>
                    <span style={s.data}>{formatarData(t.created_at)}</span>
                    {t.status === 'REJEITADO' && t.motivo_rejeicao && (
                      <div style={s.motivo}>
                        Motivo: {t.motivo_rejeicao}
                      </div>
                    )}
                    {t.observacao && (
                      <div style={s.obs}>Obs: {t.observacao}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    background: 'hsl(140 15% 6%)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'hsl(140 14% 9%)',
    borderBottom: '1px solid hsl(140 14% 16%)',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerTitulo: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'hsl(140 10% 85%)',
  },
  btnVoltar: {
    background: 'transparent',
    border: 'none',
    color: 'hsl(38 92% 60%)',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '0.25rem 0',
    minWidth: '60px',
  },
  body: {
    flex: 1,
    padding: '1rem 1.25rem',
    maxWidth: '480px',
    width: '100%',
    margin: '0 auto',
  },
  lista: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
  },
  card: {
    background: 'hsl(140 14% 10%)',
    border: '1px solid hsl(140 14% 17%)',
    borderRadius: '0.875rem',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  cardCliente: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'hsl(140 10% 85%)',
    flex: 1,
  },
  badge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '0.2rem 0.5rem',
    borderRadius: '9999px',
    flexShrink: 0,
    letterSpacing: '0.03em',
  },
  cacambas: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.625rem 0',
    borderTop: '1px solid hsl(140 14% 15%)',
    borderBottom: '1px solid hsl(140 14% 15%)',
  },
  cacambaBox: {
    flex: 1,
    textAlign: 'center' as const,
  },
  cacambaLabel: {
    fontSize: '0.65rem',
    color: 'hsl(140 10% 45%)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: '0.2rem',
  },
  cacambaNum: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'hsl(38 92% 60%)',
    fontFamily: 'monospace',
  },
  seta: {
    color: 'hsl(140 10% 35%)',
    fontSize: '1.25rem',
  },
  cardFooter: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  data: {
    fontSize: '0.75rem',
    color: 'hsl(140 10% 40%)',
  },
  motivo: {
    fontSize: '0.8rem',
    color: 'hsl(0 60% 60%)',
    background: 'hsl(0 50% 10%)',
    borderRadius: '0.375rem',
    padding: '0.375rem 0.5rem',
    marginTop: '0.25rem',
  },
  obs: {
    fontSize: '0.8rem',
    color: 'hsl(140 10% 50%)',
    fontStyle: 'italic',
  },
  empty: {
    textAlign: 'center' as const,
    color: 'hsl(140 10% 45%)',
    fontSize: '0.95rem',
    paddingTop: '3rem',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
}
