import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { CheckCircle, AlertCircle, Shield, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const ICON_MAP = { success: CheckCircle, error: AlertCircle, info: Shield }
const COLOR_MAP = {
  success: 'hsl(142,60%,65%)',
  error:   'hsl(0,80%,72%)',
  info:    'hsl(217,80%,72%)',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {toasts.map(t => {
          const Icon = ICON_MAP[t.type]
          const color = COLOR_MAP[t.type]
          return (
            <div
              key={t.id}
              onClick={() => remove(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.75rem 1rem',
                background: 'var(--card)',
                border: '1px solid var(--border-soft)',
                borderRadius: '10px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--fg)',
                cursor: 'pointer',
                maxWidth: '360px',
                animation: 'slideIn 0.2s ease',
                borderLeft: `3px solid ${color}`,
              }}
            >
              <Icon size={15} color={color} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                onClick={e => { e.stopPropagation(); remove(t.id) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 0, display: 'flex', flexShrink: 0 }}
              >
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx.toast
}
