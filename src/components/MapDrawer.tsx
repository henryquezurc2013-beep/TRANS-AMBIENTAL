import { useEffect, useState, useCallback, useMemo } from 'react'
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api'
import { db, Controle, Cliente } from '../services/dataService'
import Icon from './Icon'
import EnviarLocalizacaoModal from './EnviarLocalizacaoModal'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
const BRASILIA = { lat: -15.7801, lng: -47.9292 }
const hoje = new Date().toISOString().slice(0, 10)

// Cache de geocodificação persistido na sessão
const geocodeCache = new Map<string, { lat: number; lng: number } | null>()

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address) ?? null
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`
    )
    const data = await res.json()
    if (data.status === 'OK' && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location
      const coords = { lat: lat as number, lng: lng as number }
      geocodeCache.set(address, coords)
      return coords
    }
  } catch { /* ignore */ }
  geocodeCache.set(address, null)
  return null
}

function getStatus(c: Controle): string {
  if (c.container_fixo) return 'FIXO'
  if (c.previsao_retirada && c.previsao_retirada < hoje) return 'ATRASADO'
  return 'EM USO'
}

export const STATUS_COLOR: Record<string, string> = {
  'EM USO':     '#c97c3a',
  'ATRASADO':   '#c95236',
  'FIXO':       '#c99738',
  'DISPONIVEL': '#3a9a5a',
  'MANUTENCAO': '#c99738',
}

function markerSVG(color: string): string {
  const svg = `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="8" fill="${color}" stroke="#0d1a0d" stroke-width="2.5"/><circle cx="11" cy="11" r="3.5" fill="rgba(255,255,255,0.35)"/></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const darkStyle = [
  { elementType: 'geometry',                    stylers: [{ color: '#1a2e1a' }] },
  { elementType: 'labels.text.fill',            stylers: [{ color: '#8a9a8a' }] },
  { elementType: 'labels.text.stroke',          stylers: [{ color: '#1a2e1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d4a2d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2e1a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d2b3e' }] },
  { featureType: 'poi',  stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

export interface PinData {
  controle: Controle
  cliente: Cliente | undefined
  coords: { lat: number; lng: number }
  status: string
  cor: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSelectControle: (c: Controle) => void
}

export default function MapDrawer({ open, onClose, onSelectControle }: Props) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: API_KEY,
  })

  const [pins,       setPins]       = useState<PinData[]>([])
  const [loading,    setLoading]    = useState(false)
  const [geocoding,  setGeocoding]  = useState(false)
  const [satelite,   setSatelite]   = useState(false)
  const [selected,   setSelected]   = useState<PinData | null>(null)
  const [modalEnvio, setModalEnvio] = useState<PinData | null>(null)

  const fechar = useCallback(() => {
    setSelected(null); setModalEnvio(null); onClose()
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fechar])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setGeocoding(false)
    setPins([])
    setSelected(null)

    Promise.all([db.controle.getEmAberto(), db.clientes.getAll()])
      .then(async ([ctrl, clis]) => {
        setLoading(false)
        if (ctrl.length === 0) return
        setGeocoding(true)

        for (const c of ctrl) {
          const cli = clis.find(cl => cl.nome_cliente === c.cliente)
          const address = cli
            ? `${cli.endereco}, ${cli.bairro_cidade}, Distrito Federal, Brasil`
            : `${c.cliente}, Brasília, Distrito Federal, Brasil`

          let coords = await geocodeAddress(address)
          if (!coords) {
            const hash = [...c.id_container].reduce((a, ch) => a + ch.charCodeAt(0), 0)
            coords = {
              lat: -15.7801 + ((hash % 20) - 10) * 0.008,
              lng: -47.9292 + (((hash * 3) % 20) - 10) * 0.008,
            }
          }

          const status = getStatus(c)
          const pin: PinData = { controle: c, cliente: cli, coords, status, cor: STATUS_COLOR[status] ?? '#c97c3a' }
          setPins(prev => [...prev, pin])
          await new Promise(r => setTimeout(r, 45))
        }
        setGeocoding(false)
      })
  }, [open])

  const mapOptions = useMemo(() => ({
    styles: satelite ? [] : darkStyle,
    mapTypeId: satelite ? 'satellite' : 'roadmap',
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    clickableIcons: false,
  }), [satelite])

  if (!open) return null

  return (
    <>
      <div className="drawer-backdrop" style={{ zIndex: 299 }} onClick={fechar} />

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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            {geocoding && (
              <span style={{ fontSize: '0.65rem', color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)' }}>
                Geocodificando...
              </span>
            )}
            <div style={{ display: 'flex', background: 'hsl(145 14% 14%)', border: '1px solid var(--border-soft)', borderRadius: '0.5rem', overflow: 'hidden' }}>
              {(['Mapa', 'Satélite'] as const).map(m => (
                <button key={m} style={{
                  padding: '0.3rem 0.75rem', border: 'none', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 500, transition: 'all 0.15s',
                  background: (m === 'Satélite') === satelite ? 'var(--primary)' : 'transparent',
                  color:      (m === 'Satélite') === satelite ? 'hsl(22 30% 10%)' : 'var(--fg-3)',
                }} onClick={() => setSatelite(m === 'Satélite')}>
                  {m}
                </button>
              ))}
            </div>
            <button className="btn-ghost" style={{ padding: '0.375rem' }} onClick={fechar}>
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* Corpo */}
        <div className="map-drawer-body">
          {(!isLoaded || loading) ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--fg-dim)', fontSize: '0.875rem', gap: '0.5rem' }}>
              <div style={{ width: '16px', height: '16px', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              {loading ? 'Carregando dados...' : 'Inicializando mapa...'}
            </div>
          ) : (
            <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-soft)', minHeight: 0 }}>
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={BRASILIA}
                zoom={11}
                options={mapOptions as object}
              >
                {pins.map(pin => (
                  <Marker
                    key={pin.controle.id}
                    position={pin.coords}
                    icon={{ url: markerSVG(pin.cor), scaledSize: { width: 22, height: 22 } as unknown as google.maps.Size }}
                    onClick={() => setSelected(pin)}
                  />
                ))}

                {selected && (
                  <InfoWindow position={selected.coords} onCloseClick={() => setSelected(null)}>
                    <div style={{ background: '#182818', color: '#e8e0d0', padding: '0.75rem 0.875rem', minWidth: '210px', fontFamily: 'Inter, sans-serif', fontSize: '0.8125rem', borderRadius: '4px', lineHeight: 1.45 }}>
                      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.875rem', fontWeight: 700, color: selected.cor, marginBottom: '0.25rem' }}>
                        {selected.controle.id_container}
                      </div>
                      <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{selected.controle.cliente}</div>
                      {selected.cliente?.endereco && (
                        <div style={{ color: '#8a9a8a', fontSize: '0.75rem' }}>{selected.cliente.endereco}</div>
                      )}
                      {selected.cliente?.bairro_cidade && (
                        <div style={{ color: '#8a9a8a', fontSize: '0.75rem', marginBottom: '0.375rem' }}>{selected.cliente.bairro_cidade}</div>
                      )}
                      <div style={{ display: 'inline-block', padding: '0.1rem 0.45rem', borderRadius: '9999px', background: `${selected.cor}25`, color: selected.cor, fontSize: '0.65rem', fontWeight: 700, marginBottom: '0.625rem' }}>
                        {selected.status}
                      </div>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button
                          onClick={() => { onSelectControle(selected.controle); fechar() }}
                          style={{ flex: 1, background: '#1e3a1e', color: '#8a9a8a', border: '1px solid #2d4a2d', borderRadius: '4px', padding: '0.3rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          Ver detalhes
                        </button>
                        <button
                          onClick={() => setModalEnvio(selected)}
                          style={{ flex: 1, background: '#1e2e3a', color: '#7a9a8a', border: '1px solid #2d3a4a', borderRadius: '4px', padding: '0.3rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          📍 Enviar loc.
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>

              {/* Contador ao vivo */}
              <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, pointerEvents: 'none', background: 'hsl(145 14% 9% / 0.9)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-soft)', borderRadius: '9999px', padding: '0.3rem 0.8rem', fontSize: '0.7rem', fontWeight: 600, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                {pins.length} CONTAINERS AO VIVO
              </div>

              {/* Legenda */}
              <div style={{ position: 'absolute', bottom: '32px', left: '12px', zIndex: 10, pointerEvents: 'none', background: 'hsl(145 14% 9% / 0.9)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-soft)', borderRadius: '0.625rem', padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {[
                  { label: 'EM USO',   cor: STATUS_COLOR['EM USO'] },
                  { label: 'ATRASADO', cor: STATUS_COLOR['ATRASADO'] },
                  { label: 'FIXO',     cor: STATUS_COLOR['FIXO'] },
                ].map(({ label, cor }) => {
                  const count = pins.filter(p => p.status === label).length
                  if (count === 0) return null
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', color: 'var(--fg-3)' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: cor, flexShrink: 0 }} />
                      <span>{label}</span>
                      <span style={{ marginLeft: 'auto', paddingLeft: '0.5rem', color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)' }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {modalEnvio && (
        <EnviarLocalizacaoModal pin={modalEnvio} onClose={() => setModalEnvio(null)} />
      )}
    </>
  )
}
