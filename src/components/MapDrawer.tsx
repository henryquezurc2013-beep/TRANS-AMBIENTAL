import { useEffect, useState, useCallback } from 'react'
import { db, Controle, Cliente } from '../services/dataService'
import Icon from './Icon'

interface Props {
  open: boolean
  onClose: () => void
  onSelectControle: (c: Controle) => void
}

const hoje = new Date().toISOString().slice(0, 10)

const COORDS_BAIRRO: Record<string, { x: number; y: number }> = {
  'Ceilândia':    { x: 22, y: 64 },
  'Taguatinga':   { x: 38, y: 72 },
  'Asa Norte':    { x: 52, y: 42 },
  'Asa Sul':      { x: 50, y: 58 },
  'Águas Claras': { x: 32, y: 60 },
  'SIA':          { x: 46, y: 68 },
  'Samambaia':    { x: 18, y: 72 },
  'Sobradinho':   { x: 62, y: 28 },
  'Gama':         { x: 42, y: 82 },
  'Luziânia':     { x: 72, y: 68 },
  'Planaltina':   { x: 72, y: 30 },
  'Guará':        { x: 44, y: 64 },
  'Cruzeiro':     { x: 50, y: 52 },
  'Brazlândia':   { x: 14, y: 40 },
  'Paranoá':      { x: 68, y: 52 },
  'Santa Maria':  { x: 54, y: 80 },
  'default':      { x: 50, y: 50 },
}

const STATUS_COR: Record<string, string> = {
  'ATRASADO':  'hsl(8 72% 62%)',
  'FIXO':      'hsl(38 85% 58%)',
  'EM USO':    'hsl(22 68% 58%)',
  'DISPONIVEL':'hsl(142 55% 55%)',
  'MANUTENCAO':'hsl(38 85% 58%)',
}

function getStatus(c: Controle): string {
  if (c.container_fixo) return 'FIXO'
  if (c.previsao_retirada && c.previsao_retirada < hoje) return 'ATRASADO'
  return 'EM USO'
}

function getPosicao(c: Controle, clientes: Cliente[]): { x: number; y: number } {
  const cli = clientes.find(cl => cl.nome_cliente === c.cliente)
  const bairroCidade = (cli?.bairro_cidade ?? '').toLowerCase()

  for (const [bairro, coords] of Object.entries(COORDS_BAIRRO)) {
    if (bairro !== 'default' && bairroCidade.includes(bairro.toLowerCase())) {
      const hash = [...c.id_container].reduce((a, ch) => a + ch.charCodeAt(0), 0)
      return {
        x: Math.max(5, Math.min(95, coords.x + ((hash % 7) - 3))),
        y: Math.max(5, Math.min(95, coords.y + (((hash * 3) % 7) - 3))),
      }
    }
  }

  const hash = [...c.cliente].reduce((a, ch) => a + ch.charCodeAt(0), 0)
  const def = COORDS_BAIRRO['default']
  return {
    x: Math.max(5, Math.min(95, def.x + ((hash % 13) - 6))),
    y: Math.max(5, Math.min(95, def.y + (((hash * 3) % 13) - 6))),
  }
}

interface Tooltip {
  x: number; y: number
  id: string; cliente: string; status: string; cor: string
}

export default function MapDrawer({ open, onClose, onSelectControle }: Props) {
  const [controles, setControles] = useState<Controle[]>([])
  const [clientes,  setClientes]  = useState<Cliente[]>([])
  const [loading,   setLoading]   = useState(true)
  const [tooltip,   setTooltip]   = useState<Tooltip | null>(null)
  const [satelite,  setSatelite]  = useState(false)

  const fechar = useCallback(() => { setTooltip(null); onClose() }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fechar])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([db.controle.getEmAberto(), db.clientes.getAll()]).then(([ctrl, clis]) => {
      setControles(ctrl)
      setClientes(clis)
      setLoading(false)
    })
  }, [open])

  if (!open) return null

  const pins = controles.map(c => {
    const status = getStatus(c)
    const pos = getPosicao(c, clientes)
    return { controle: c, status, cor: STATUS_COR[status] ?? STATUS_COR['EM USO'], pos }
  })

  const bgMap = satelite
    ? 'radial-gradient(ellipse at 40% 60%, hsl(130 30% 12%), hsl(145 18% 7%))'
    : 'radial-gradient(ellipse at 50% 50%, hsl(145 18% 13%), hsl(145 18% 9%))'

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" style={{ zIndex: 299 }} onClick={fechar} />

      {/* Drawer */}
      <div className="map-drawer">
        {/* Header */}
        <div className="map-drawer-head">
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 600, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
              OPERAÇÃO · DISTRITO FEDERAL
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 400, color: 'var(--fg)', lineHeight: 1.1 }}>
              Onde estão seus containers
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Toggle satélite/mapa */}
            <div style={{ display: 'flex', background: 'hsl(145 14% 14%)', border: '1px solid var(--border-soft)', borderRadius: '0.5rem', overflow: 'hidden' }}>
              {(['Mapa', 'Satélite'] as const).map(m => (
                <button
                  key={m}
                  style={{
                    padding: '0.3rem 0.75rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
                    background: (m === 'Satélite') === satelite ? 'var(--primary)' : 'transparent',
                    color:      (m === 'Satélite') === satelite ? 'hsl(22 30% 10%)' : 'var(--fg-3)',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => setSatelite(m === 'Satélite')}
                >
                  {m}
                </button>
              ))}
            </div>
            <button className="btn-ghost" style={{ padding: '0.375rem' }} onClick={fechar}>
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* Mapa */}
        <div className="map-drawer-body">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-dim)', fontSize: '0.875rem' }}>
              Carregando mapa...
            </div>
          ) : (
            <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden', background: bgMap, border: '1px solid var(--border-soft)' }}>

              {/* Grid */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'linear-gradient(hsl(140 15% 18% / 0.35) 1px, transparent 1px), linear-gradient(90deg, hsl(140 15% 18% / 0.35) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                maskImage: 'radial-gradient(ellipse at center, #000 45%, transparent 88%)',
              }} />

              {/* SVG — contorno do DF + Lago */}
              <svg
                viewBox="0 0 100 100"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                preserveAspectRatio="none"
              >
                {/* Contorno do DF — polígono simplificado */}
                <polygon
                  points="14,20 28,10 60,8 80,16 85,44 82,64 68,88 44,92 22,86 10,65 10,44"
                  fill={satelite ? 'hsl(130 22% 14% / 0.45)' : 'hsl(145 18% 14% / 0.55)'}
                  stroke="hsl(140 18% 32% / 0.5)"
                  strokeWidth="0.6"
                  vectorEffect="non-scaling-stroke"
                />
                {/* Eixo Monumental (linha central leste-oeste) */}
                <line x1="36" y1="50" x2="64" y2="50" stroke="hsl(140 15% 28% / 0.5)" strokeWidth="0.4" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
                {/* Lago Paranoá */}
                <path
                  d="M 63,38 C 69,32 74,40 71,50 C 69,58 63,58 60,53 C 56,47 58,40 63,38 Z"
                  fill="hsl(210 55% 35% / 0.35)"
                  stroke="hsl(210 55% 60% / 0.4)"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
                <text x="66" y="47" fontSize="2.2" fill="hsl(210 55% 70% / 0.55)" textAnchor="middle" fontFamily="serif" fontStyle="italic">
                  Paranoá
                </text>
                {/* Label Brasília */}
                <text x="50" y="50" fontSize="3.5" fill="hsl(40 10% 70% / 0.12)" textAnchor="middle" fontFamily="serif" fontWeight="bold" letterSpacing="1">
                  BRASÍLIA
                </text>
              </svg>

              {/* Pins */}
              {pins.map(({ controle: c, cor, pos }) => (
                <div
                  key={c.id}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}%`, top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer',
                    zIndex: tooltip?.id === c.id_container ? 10 : 2,
                  }}
                  onMouseEnter={() => setTooltip({ x: pos.x, y: pos.y, id: c.id_container, cliente: c.cliente, status: getStatus(c), cor })}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => { onSelectControle(c); fechar() }}
                >
                  {/* Anel de pulse */}
                  <div style={{
                    position: 'absolute', inset: '-6px', borderRadius: '50%',
                    background: cor, opacity: 0.22,
                    animation: 'pin-pulse 2.4s ease-out infinite',
                  }} />
                  {/* Dot */}
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: cor,
                    boxShadow: `0 0 0 2px hsl(145 18% 9%), 0 0 10px ${cor}`,
                  }} />
                </div>
              ))}

              {/* Tooltip */}
              {tooltip && (
                <div style={{
                  position: 'absolute',
                  left: `${Math.min(tooltip.x + 3, 58)}%`,
                  top: `${Math.max(tooltip.y - 14, 2)}%`,
                  background: 'hsl(145 14% 10% / 0.97)',
                  border: `1px solid ${tooltip.cor}44`,
                  borderRadius: '0.5rem',
                  padding: '0.45rem 0.7rem',
                  pointerEvents: 'none',
                  zIndex: 20,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  minWidth: '140px',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: tooltip.cor }}>{tooltip.id}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--fg-2)', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{tooltip.cliente}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--fg-dim)', marginTop: '0.1rem' }}>{tooltip.status}</div>
                </div>
              )}

              {/* Contador ao vivo */}
              <div style={{
                position: 'absolute', top: '12px', right: '12px',
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                background: 'hsl(145 14% 9% / 0.88)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--border-soft)',
                borderRadius: '9999px',
                padding: '0.3rem 0.8rem',
                fontSize: '0.7rem', fontWeight: 600,
                color: 'var(--fg-2)',
                fontFamily: 'var(--font-mono)',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pin-pulse 2s ease-out infinite' }} />
                {pins.length} CONTAINERS AO VIVO
              </div>

              {/* Legenda */}
              <div style={{
                position: 'absolute', bottom: '12px', left: '12px',
                background: 'hsl(145 14% 9% / 0.88)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--border-soft)',
                borderRadius: '0.625rem',
                padding: '0.5rem 0.75rem',
                display: 'flex', flexDirection: 'column', gap: '0.3rem',
              }}>
                {[
                  { status: 'EM USO',     cor: STATUS_COR['EM USO']     },
                  { status: 'ATRASADO',   cor: STATUS_COR['ATRASADO']   },
                  { status: 'FIXO',       cor: STATUS_COR['FIXO']       },
                ].map(({ status, cor }) => {
                  const count = pins.filter(p => p.status === status).length
                  if (count === 0) return null
                  return (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', color: 'var(--fg-3)' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: cor, flexShrink: 0 }} />
                      <span>{status}</span>
                      <span style={{ marginLeft: 'auto', paddingLeft: '0.5rem', color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)' }}>{count}</span>
                    </div>
                  )
                })}
              </div>

              {/* Hint clique */}
              <div style={{ position: 'absolute', bottom: '12px', right: '12px', fontSize: '0.6rem', color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>
                Clique no pin para detalhes
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
