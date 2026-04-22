import { useState } from 'react'
import { useToast } from './Toast'
import type { PinData } from './MapDrawer'
import Icon from './Icon'

interface Props {
  pin: PinData
  onClose: () => void
}

type Metodo = 'whatsapp' | 'sms' | 'copiar'

export default function EnviarLocalizacaoModal({ pin, onClose }: Props) {
  const toast = useToast()
  const [telefone, setTelefone] = useState('')
  const [motorista, setMotorista] = useState('')
  const [metodo, setMetodo] = useState<Metodo>('whatsapp')

  const endereco = pin.cliente?.endereco
    ? `${pin.cliente.endereco}${pin.cliente.bairro_cidade ? ', ' + pin.cliente.bairro_cidade : ''}`
    : pin.controle.cliente

  const mapsUrl = `https://www.google.com/maps?q=${pin.coords.lat},${pin.coords.lng}`

  const mensagem =
    `🗺️ Trans Ambiental — Localização do cliente\n` +
    `Cliente: ${pin.controle.cliente}\n` +
    `Endereço: ${endereco}\n` +
    `Container: ${pin.controle.id_container}\n` +
    `Maps: ${mapsUrl}`

  function telLimpo() {
    return telefone.replace(/\D/g, '')
  }

  function enviar() {
    if (metodo !== 'copiar' && telLimpo().length < 10) {
      toast('Informe um número de telefone válido', 'error')
      return
    }
    if (metodo === 'whatsapp') {
      window.open(`https://wa.me/55${telLimpo()}?text=${encodeURIComponent(mensagem)}`, '_blank')
    } else if (metodo === 'sms') {
      window.open(`sms:+55${telLimpo()}?body=${encodeURIComponent(mensagem)}`)
    } else {
      navigator.clipboard.writeText(mensagem).then(() => toast('Link copiado!', 'success'))
      onClose()
      return
    }
    onClose()
  }

  return (
    <>
      <div
        className="drawer-backdrop"
        style={{ zIndex: 399 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: 'hsl(145 14% 10%)',
          border: '1px solid var(--border-soft)',
          borderRadius: '1rem',
          padding: '1.5rem',
          width: '100%', maxWidth: '420px',
          pointerEvents: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
                ENVIAR LOCALIZAÇÃO
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', color: 'var(--fg)', lineHeight: 1.1 }}>
                {pin.controle.id_container}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--fg-dim)', marginTop: '0.2rem' }}>
                {pin.controle.cliente}
              </div>
            </div>
            <button className="btn-ghost" style={{ padding: '0.375rem' }} onClick={onClose}>
              <Icon name="x" size={16} />
            </button>
          </div>

          {/* Preview da mensagem */}
          <div style={{
            background: 'hsl(145 14% 7%)',
            border: '1px solid var(--border-soft)',
            borderRadius: '0.625rem',
            padding: '0.75rem',
            marginBottom: '1rem',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--fg-3)',
            whiteSpace: 'pre-line',
            lineHeight: 1.6,
          }}>
            {mensagem}
          </div>

          {/* Motorista */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--fg-dim)', marginBottom: '0.3rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Motorista (opcional)
            </label>
            <input
              className="input"
              placeholder="Nome do motorista"
              value={motorista}
              onChange={e => setMotorista(e.target.value)}
            />
          </div>

          {/* Método */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--fg-dim)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Método de envio
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {([
                { id: 'whatsapp', label: 'WhatsApp' },
                { id: 'sms',      label: 'SMS' },
                { id: 'copiar',   label: 'Copiar link' },
              ] as { id: Metodo; label: string }[]).map(m => (
                <button
                  key={m.id}
                  className="motivo-chip"
                  data-active={metodo === m.id ? 'true' : undefined}
                  onClick={() => setMetodo(m.id)}
                  style={metodo === m.id ? {
                    background: 'var(--primary)',
                    color: 'hsl(22 30% 10%)',
                    borderColor: 'var(--primary)',
                  } : {}}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Telefone */}
          {metodo !== 'copiar' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--fg-dim)', marginBottom: '0.3rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Número de telefone
              </label>
              <input
                className="input"
                placeholder="(61) 9 0000-0000"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                type="tel"
              />
            </div>
          )}

          {/* Ações */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" style={{ flex: 2 }} onClick={enviar}>
              {metodo === 'copiar' ? 'Copiar mensagem' : metodo === 'whatsapp' ? 'Enviar WhatsApp' : 'Enviar SMS'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
