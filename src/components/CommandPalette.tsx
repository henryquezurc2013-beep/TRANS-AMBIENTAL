import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, Container } from '../services/dataService'
import Icon from './Icon'

interface Props {
  open: boolean
  onClose: () => void
}

interface CpItem {
  id: string
  label: string
  meta?: string
  icon: string
  group: string
  action: () => void
}

export default function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const [containers, setContainers] = useState<Container[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const fechar = useCallback(() => { setQuery(''); setCursor(0); onClose() }, [onClose])

  useEffect(() => {
    if (open) {
      db.containers.getAll().then(setContainers)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => { setCursor(0) }, [query])

  const ir = useCallback((path: string) => { navigate(path); fechar() }, [navigate, fechar])

  const BASE_ITEMS: CpItem[] = [
    /* Navegação */
    { id: 'nav-dash',    label: 'Dashboard',       meta: 'GD', icon: 'dashboard',   group: 'Navegação', action: () => ir('/dashboard')           },
    { id: 'nav-ctrl',    label: 'Controle',         meta: 'GC', icon: 'clipboard',   group: 'Navegação', action: () => ir('/controle')             },
    { id: 'nav-cli',     label: 'Clientes',         meta: 'GL', icon: 'users',       group: 'Navegação', action: () => ir('/clientes')             },
    { id: 'nav-troca',   label: 'Troca',            meta: 'GT', icon: 'swap',        group: 'Navegação', action: () => ir('/troca-container')      },
    { id: 'nav-manut',   label: 'Manutenção',       meta: 'GM', icon: 'wrench',      group: 'Navegação', action: () => ir('/manutencao')           },
    { id: 'nav-est',     label: 'Estoque',          icon: 'warehouse', group: 'Navegação', action: () => ir('/estoque')             },
    { id: 'nav-logs',    label: 'Logs',             icon: 'scroll',    group: 'Navegação', action: () => ir('/logs')                },
    { id: 'nav-atr',     label: 'Atrasados',        icon: 'alert',     group: 'Navegação', action: () => ir('/atrasados')           },
    /* Ações */
    { id: 'act-novo',    label: 'Novo registro',    meta: 'N',  icon: 'plus_circle', group: 'Ações',     action: () => ir('/cadastro-rapido')      },
    { id: 'act-troca',   label: 'Troca rápida',     meta: 'T',  icon: 'swap',        group: 'Ações',     action: () => ir('/troca-container')      },
    { id: 'act-cliente', label: 'Novo cliente',     meta: 'NC', icon: 'users',       group: 'Ações',     action: () => ir('/clientes')             },
  ]

  const containerItems: CpItem[] = containers
    .filter(c => !query || c.id_container.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6)
    .map(c => ({
      id: `ct-${c.id}`,
      label: c.id_container,
      meta: c.status_operacional,
      icon: 'package',
      group: 'Containers',
      action: () => { navigate('/controle'); fechar() },
    }))

  const q = query.toLowerCase()
  const filtered = [
    ...BASE_ITEMS.filter(i => !query || i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q)),
    ...containerItems,
  ]

  const groups = Array.from(new Set(filtered.map(i => i.group)))

  const flat = groups.flatMap(g => filtered.filter(i => i.group === g))

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && flat[cursor]) { flat[cursor].action() }
    if (e.key === 'Escape') fechar()
  }

  if (!open) return null

  let globalIdx = -1

  return (
    <div className="cp-backdrop" onClick={fechar}>
      <div className="cp-panel" onClick={e => e.stopPropagation()}>
        <div className="cp-input-wrap">
          <Icon name="search" size={15} style={{ color: 'var(--fg-dim)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="cp-input"
            placeholder="Buscar páginas, ações, containers..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />
          {query && (
            <button className="btn-ghost" style={{ padding: '0.125rem 0.375rem', fontSize: '0.75rem' }} onClick={() => setQuery('')}>
              <Icon name="x" size={13} />
            </button>
          )}
        </div>

        <div className="cp-results">
          {flat.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--fg-dim)', fontSize: '0.875rem' }}>
              Nenhum resultado para "{query}"
            </div>
          ) : groups.map(group => {
            const items = filtered.filter(i => i.group === group)
            return (
              <div key={group}>
                <div className="cp-group-label">{group}</div>
                {items.map(item => {
                  globalIdx++
                  const idx = globalIdx
                  return (
                    <div
                      key={item.id}
                      className={`cp-item${cursor === idx ? ' on' : ''}`}
                      onMouseEnter={() => setCursor(idx)}
                      onClick={item.action}
                    >
                      <Icon name={item.icon} size={14} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
                      {item.label}
                      {item.meta && <span className="cp-meta">{item.meta}</span>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="cp-hint">
          <span><kbd>↑↓</kbd> navegar · <kbd>↵</kbd> selecionar · <kbd>Esc</kbd> fechar</span>
          <span>⌘K</span>
        </div>
      </div>
    </div>
  )
}
