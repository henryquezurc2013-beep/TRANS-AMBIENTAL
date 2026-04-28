import { useState } from 'react'
import Icon from './Icon'

export interface BreakdownItem {
  label: string
  value: number | string
}

export interface StatCardProps {
  label:     string
  value:     number
  unit?:     string
  icon:      string
  accent:    string
  delta:     { dir: 'up' | 'down' | 'flat'; text: string }
  trend?:    number[]
  breakdown?: BreakdownItem[]
  onClick?:  () => void
  active?:   boolean
}

export default function StatCard({
  label, value, unit, icon, accent,
  delta, trend = [], breakdown = [],
  onClick, active = false,
}: StatCardProps) {
  const [hovered, setHovered]       = useState(false)
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  const displayValue = hoveredBar !== null && trend[hoveredBar] !== undefined
    ? Math.max(0, Math.round(trend[hoveredBar] * value * 1.5))
    : value

  const deltaClass = delta.dir === 'up' ? 'up' : delta.dir === 'down' ? 'down' : 'flat'

  return (
    <div
      className={`stat-card${active ? ' is-active' : ''}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        paddingBottom: '2.5rem',
        ['--accent-bar' as string]: accent,
      } as React.CSSProperties}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setHoveredBar(null) }}
    >
      {/* Ícone + label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div className="kpi-label">{label}</div>
        <div style={{
          background: hovered
            ? `color-mix(in srgb, ${accent} 12%, transparent)`
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${hovered
            ? `color-mix(in srgb, ${accent} 25%, transparent)`
            : 'rgba(255,255,255,0.06)'}`,
          borderRadius: '0.4rem',
          padding: '0.3rem',
          transition: 'all 0.18s',
        }}>
          <Icon
            name={icon}
            size={13}
            color={hovered ? accent : 'hsl(210,20%,45%)'}
            style={{ transition: 'color 0.18s', display: 'block' }}
          />
        </div>
      </div>

      {/* Valor */}
      <div
        className="kpi-value"
        style={{ color: hovered ? accent : 'var(--fg)', transition: 'color 0.18s' }}
      >
        {displayValue}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>

      {/* Delta ou Breakdown no hover */}
      <div style={{ marginTop: '0.25rem', minHeight: '1.25rem' }}>
        {hovered && breakdown.length > 0 ? (
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            {breakdown.map(b => (
              <span key={b.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: accent, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: '0.68rem', color: accent, fontWeight: 700 }}>{b.value}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--fg-muted)' }}>{b.label}</span>
              </span>
            ))}
          </div>
        ) : (
          <div className={`kpi-delta ${deltaClass}`}>{delta.text}</div>
        )}
      </div>

      {/* Sparkline + período */}
      {trend.length === 9 && (
        <div style={{
          position: 'absolute',
          bottom: '0.375rem',
          right: '0.375rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '4px',
        }}>
          <div className="sparkline">
            {trend.map((v, i) => (
              <span
                key={i}
                onMouseEnter={e => { e.stopPropagation(); setHoveredBar(i) }}
                onMouseLeave={e => { e.stopPropagation(); setHoveredBar(null) }}
                style={{
                  display: 'block',
                  width: '6px',
                  height: `${Math.max(12, Math.round(v * 100))}%`,
                  background: accent,
                  borderRadius: '2px 2px 0 0',
                  opacity: hoveredBar === i ? 1 : i === 8 ? 0.7 : 0.25,
                  transition: 'opacity 0.15s',
                }}
              />
            ))}
          </div>
          <div style={{
            fontSize: '9px',
            color: 'var(--fg-dim)',
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}>
            últimos {trend.length} dias
          </div>
        </div>
      )}

      {/* Linha reveladora na base */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0,
        height: '2px',
        width: '100%',
        background: accent,
        transformOrigin: 'left',
        transform: hovered || active ? 'scaleX(1)' : 'scaleX(0)',
        transition: 'transform 0.22s ease',
      }} />
    </div>
  )
}
