interface Props { status: string }

const MAP: Record<string, { label: string; cls: string }> = {
  DISPONIVEL:  { label: 'Disponível', cls: 'badge-success'     },
  'EM USO':    { label: 'Em uso',     cls: 'badge-info'        },
  MANUTENCAO:  { label: 'Manutenção', cls: 'badge-warning'     },
  PENDENTE:    { label: 'Pendente',   cls: 'badge-warning'     },
  ATRASADO:    { label: 'Atrasado',   cls: 'badge-destructive' },
  FIXO:        { label: 'Fixo',       cls: 'badge-warning'     },
}

export default function StatusBadge({ status }: Props) {
  const cfg = MAP[status]
  if (!cfg) return <span className="badge badge-muted"><span className="dot" />{status}</span>
  return (
    <span className={`badge ${cfg.cls}`}>
      <span className="dot" />
      {cfg.label}
    </span>
  )
}
