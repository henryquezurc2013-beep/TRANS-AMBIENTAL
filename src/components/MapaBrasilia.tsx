import { useState } from 'react'
import { Controle } from '../services/dataService'

interface Props {
  controles: Controle[]
}

// Bairros aproximados do DF com coordenadas relativas (0-100)
const BAIRROS: Record<string, [number, number]> = {
  'ASA NORTE':        [52, 34],
  'ASA SUL':          [52, 52],
  'TAGUATINGA':       [28, 48],
  'CEILÂNDIA':        [18, 42],
  'SAMAMBAIA':        [22, 60],
  'GAMA':             [44, 74],
  'SOBRADINHO':       [62, 22],
  'PLANALTINA':       [72, 18],
  'GUARÁ':            [40, 52],
  'ÁGUAS CLARAS':     [32, 56],
  'RECANTO DAS EMAS': [30, 72],
  'SANTA MARIA':      [52, 68],
  'SÃO SEBASTIÃO':    [68, 56],
  'RIACHO FUNDO':     [36, 62],
  'NÚCLEO BANDEIRANTE': [44, 58],
  'CRUZEIRO':         [48, 46],
  'BRAZLÂNDIA':       [14, 28],
  'PARANOÁ':          [72, 44],
}

function posicaoPin(cliente: string): [number, number] {
  const upper = cliente.toUpperCase()
  for (const [bairro, pos] of Object.entries(BAIRROS)) {
    if (upper.includes(bairro)) return pos
  }
  // posição pseudoaleatória baseada no nome
  const hash = [...cliente].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return [25 + (hash % 50), 20 + ((hash * 7) % 60)]
}

function corStatus(controle: Controle): string {
  const hoje = new Date().toISOString().slice(0, 10)
  if (controle.data_retirada !== null) return 'var(--success)'
  if (controle.container_fixo) return 'hsl(38 85% 52%)'
  if (controle.previsao_retirada && controle.previsao_retirada < hoje) return 'var(--destructive)'
  return 'var(--primary)'
}

export default function MapaBrasilia({ controles }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null)

  const ativos = controles.filter(c => c.data_retirada === null)

  return (
    <div className="map-card" style={{ minHeight: '340px' }}>
      <div className="map-grid" />

      {/* Lago Paranoá — SVG decorativo */}
      <svg
        viewBox="0 0 100 100"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        preserveAspectRatio="none"
      >
        <path
          d="M 60 35 Q 65 30 68 38 Q 72 44 68 52 Q 66 58 62 56 Q 58 60 56 54 Q 52 50 54 44 Q 55 38 60 35 Z"
          fill="hsl(217 60% 40% / 0.18)"
          stroke="hsl(217 60% 60% / 0.3)"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
        {/* Label lago */}
        <text x="62" y="46" fontSize="3" fill="hsl(217 60% 70% / 0.5)" textAnchor="middle" fontFamily="serif" fontStyle="italic">
          Paranoá
        </text>
      </svg>

      {/* Pins */}
      {ativos.map(c => {
        const [px, py] = posicaoPin(c.cliente)
        const cor = corStatus(c)
        return (
          <div
            key={c.id}
            className="map-pin"
            style={{ left: `${px}%`, top: `${py}%`, color: cor }}
            onMouseEnter={e => {
              const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
              setTooltip({ x: px, y: py, label: `${c.id_container} · ${c.cliente}` })
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        )
      })}

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: `${Math.min(tooltip.x + 2, 65)}%`,
          top: `${Math.max(tooltip.y - 12, 2)}%`,
          background: 'hsl(145 14% 11%)',
          border: '1px solid var(--border-soft)',
          borderRadius: '0.5rem',
          padding: '0.375rem 0.625rem',
          fontSize: '0.75rem',
          fontWeight: 500,
          color: 'var(--fg)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          {tooltip.label}
        </div>
      )}

      {/* Legenda */}
      <div style={{ position: 'absolute', bottom: '12px', left: '12px', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { cor: 'var(--primary)',     label: 'Em uso' },
          { cor: 'var(--destructive)', label: 'Atrasado' },
          { cor: 'hsl(38 85% 52%)',   label: 'Fixo' },
        ].map(({ cor, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', color: 'var(--fg-3)', background: 'hsl(145 14% 9% / 0.8)', padding: '0.2rem 0.5rem', borderRadius: '9999px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cor }} />
            {label}
          </div>
        ))}
      </div>

      {/* Contador */}
      <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-2)', background: 'hsl(145 14% 9% / 0.85)', padding: '0.3rem 0.7rem', borderRadius: '9999px', border: '1px solid var(--border-soft)', fontFamily: 'var(--font-mono)' }}>
        {ativos.length} ao vivo
      </div>
    </div>
  )
}
