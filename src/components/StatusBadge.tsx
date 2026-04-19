import { CheckCircle, Truck, Wrench, Clock, AlertTriangle } from 'lucide-react'

interface Props {
  status: string
}

const MAP: Record<string, {
  label:     string
  className: string
  Icone:     typeof CheckCircle
  pulse?:    boolean
}> = {
  DISPONIVEL: { label: 'Disponível', className: 'badge-success',     Icone: CheckCircle             },
  'EM USO':   { label: 'Em Uso',     className: 'badge-info',        Icone: Truck,     pulse: true  },
  MANUTENCAO: { label: 'Manutenção', className: 'badge-warning',     Icone: Wrench                  },
  PENDENTE:   { label: 'Pendente',   className: 'badge-pending',     Icone: Clock                   },
  ATRASADO:   { label: 'Atrasado',   className: 'badge-destructive', Icone: AlertTriangle           },
}

export default function StatusBadge({ status }: Props) {
  const cfg = MAP[status]

  if (!cfg) {
    return <span className="badge badge-muted">{status}</span>
  }

  const { label, className, Icone, pulse } = cfg

  return (
    <span className={`badge ${className}`}>
      <Icone size={12} />
      {label}
      {pulse && (
        <>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: 'currentColor', flexShrink: 0,
            animation: 'statusPulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite',
          }} />
          <style>{`
            @keyframes statusPulse {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.3; }
            }
          `}</style>
        </>
      )}
    </span>
  )
}
