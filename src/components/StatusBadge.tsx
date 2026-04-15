import { CheckCircle, Truck, Wrench, Clock, AlertTriangle } from 'lucide-react'

interface Props {
  status: string
}

const MAP: Record<string, {
  label: string
  cor: string
  Icone: typeof CheckCircle
  pulse?: boolean
}> = {
  DISPONIVEL:   { label: 'Disponível',  cor: 'hsl(142,71%,45%)', Icone: CheckCircle   },
  'EM USO':     { label: 'Em Uso',      cor: 'hsl(217,91%,60%)', Icone: Truck, pulse: true },
  MANUTENCAO:   { label: 'Manutenção',  cor: 'hsl(38,92%,50%)',  Icone: Wrench        },
  PENDENTE:     { label: 'Pendente',    cor: 'hsl(25,95%,55%)',  Icone: Clock         },
  ATRASADO:     { label: 'Atrasado',    cor: 'hsl(0,84%,60%)',   Icone: AlertTriangle },
}

export default function StatusBadge({ status }: Props) {
  const cfg = MAP[status]

  if (!cfg) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '3px 10px', borderRadius: '999px',
        fontSize: '12px', fontWeight: 500,
        background: 'hsl(222,37%,18%)', color: 'hsl(210,20%,55%)',
        border: '1px solid hsl(220,25%,25%)',
      }}>
        {status}
      </span>
    )
  }

  const { label, cor, Icone, pulse } = cfg

  // Converte hsl() para rgba com opacidade 15%
  const bg = cor.replace('hsl(', 'hsl(').replace(')', ' / 0.15)')

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '999px',
      fontSize: '12px', fontWeight: 500,
      background: bg, color: cor,
      border: `1px solid ${cor.replace(')', ' / 0.3)')}`,
    }}>
      <Icone size={12} />
      {label}
      {pulse && (
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: cor, flexShrink: 0,
          animation: 'pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite',
        }} />
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </span>
  )
}
