import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AppLayout from './AppLayout'
import { ShieldOff } from 'lucide-react'

interface Props {
  pagina: string
  children: React.ReactNode
}

export default function ProtectedRoute({ pagina, children }: Props) {
  const { sessao, temAcesso } = useAuth()

  if (!sessao?.logado) {
    return <Navigate to="/login" replace />
  }

  if (!temAcesso(pagina)) {
    return (
      <AppLayout>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '1rem',
          color: 'hsl(210,20%,50%)',
        }}>
          <ShieldOff size={48} />
          <h2 style={{ margin: 0, color: 'hsl(210,20%,70%)', fontWeight: 600 }}>Acesso Negado</h2>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Você não tem permissão para acessar esta página.</p>
        </div>
      </AppLayout>
    )
  }

  return <AppLayout>{children}</AppLayout>
}
