import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { db, Controle, Cliente } from '../services/dataService'
import Icon from './Icon'
import EnviarLocalizacaoModal from './EnviarLocalizacaoModal'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
const BRASIL_CENTER = { lat: -14.235, lng: -51.9253 }
const hoje = new Date().toISOString().slice(0, 10)

// Só cacheia sucessos — falhas são retentadas na próxima abertura
const geocodeCache = new Map<string, { lat: number; lng: number }>()

async function geocodeOne(address: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address)!
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
  return null
}

async function geocodeAddress(
  cli: { endereco: string; bairro_cidade: string } | undefined,
  clienteNome: string,
): Promise<{ lat: number; lng: number } | null> {
  if (cli) {
    const full    = [cli.endereco, cli.bairro_cidade, 'Brasil'].filter(Boolean).join(', ')
    const partial = [cli.bairro_cidade, 'Brasil'].filter(Boolean).join(', ')
    console.log('Geocoding full:', full)
    const r1 = await geocodeOne(full)
    if (r1) return r1
    console.log('Geocoding fallback:', partial)
    const r2 = await geocodeOne(partial)
    if (r2) return r2
  }
  const byName = `${clienteNome}, Brasil`
  console.log('Geocoding por nome:', byName)
  return geocodeOne(byName)
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
  const svg = `<svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg"><circle cx="13" cy="13" r="9" fill="${color}" stroke="#0d1a0d" stroke-width="2.5"/><circle cx="13" cy="13" r="4" fill="rgba(255,255,255,0.35)"/></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const darkStyle = [
  { elementType: 'geometry',                      stylers: [{ color: '#1a2e1a' }] },
  { elementType: 'labels.text.fill',              stylers: [{ color: '#8a9a8a' }] },
  { elementType: 'labels.text.stroke',            stylers: [{ color: '#1a2e1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d4a2d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2e1a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d2b3e' }] },
  { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
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

  const mapRef                          = useRef<google.maps.Map | null>(null)
  const clustererRef                    = useRef<MarkerClusterer | null>(null)
  const markersRef                      = useRef<google.maps.Marker[]>([])
  const [pins,          setPins]        = useState<PinData[]>([])
  const [loading,       setLoading]     = useState(false)
  const [geocoding,     setGeocoding]   = useState(false)
  const [naoLocalizados, setNaoLoc]    = useState(0)
  const [satelite,      setSatelite]    = useState(false)
  const [selected,      setSelected]    = useState<PinData | null>(null)
  const [infoWindow,    setInfoWindow]  = useState<google.maps.InfoWindow | null>(null)
  const [modalEnvio,    setModalEnvio]  = useState<PinData | null>(null)

  const fechar = useCallback(() => {
    setSelected(null); setModalEnvio(null); onClose()
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fechar])

  // Limpa markers e clusterer ao fechar
  useEffect(() => {
    if (!open) {
      markersRef.current.forEach(m => m.setMap(null))
      markersRef.current = []
      clustererRef.current?.clearMarkers()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setGeocoding(false)
    setPins([])
    setSelected(null)
    setNaoLoc(0)

    Promise.all([db.controle.getEmAberto(), db.clientes.getAll()])
      .then(async ([ctrl, clis]) => {
        setLoading(false)
        if (ctrl.length === 0) return
        setGeocoding(true)
        let semCoords = 0

        for (const c of ctrl) {
          const cli = clis.find(cl => cl.nome_cliente === c.cliente)

          let coords = await geocodeAddress(cli, c.cliente)
          if (!coords) {
            semCoords++
            // Último recurso: posição pseudoaleatória no Brasil
            const hash = [...c.id_container].reduce((a, ch) => a + ch.charCodeAt(0), 0)
            coords = {
              lat: -14.235 + ((hash % 30) - 15) * 0.5,
              lng: -51.925 + (((hash * 3) % 30) - 15) * 0.5,
            }
          }

          const status = getStatus(c)
          const pin: PinData = { controle: c, cliente: cli, coords, status, cor: STATUS_COLOR[status] ?? '#c97c3a' }
          setPins(prev => [...prev, pin])
          if (semCoords > 0) setNaoLoc(semCoords)
          await new Promise(r => setTimeout(r, 45))
        }
        setGeocoding(false)
      })
  }, [open])

  // Sincroniza markers nativos + clustering + fitBounds quando pins mudam
  useEffect(() => {
    if (!isLoaded || !mapRef.current || pins.length === 0) return

    const map = mapRef.current

    // Limpa markers anteriores
    markersRef.current.forEach(m => m.setMap(null))
    clustererRef.current?.clearMarkers()

    const bounds = new google.maps.LatLngBounds()
    const newMarkers: google.maps.Marker[] = []

    for (const pin of pins) {
      const marker = new google.maps.Marker({
        position: pin.coords,
        icon: {
          url: markerSVG(pin.cor),
          scaledSize: new google.maps.Size(26, 26),
        },
        title: `${pin.controle.id_container} · ${pin.controle.cliente}`,
      })

      marker.addListener('click', () => {
        // Fecha InfoWindow anterior
        infoWindow?.close()

        const iw = new google.maps.InfoWindow({
          content: buildInfoWindowContent(pin),
        })
        iw.open({ map, anchor: marker })
        setInfoWindow(iw)
        setSelected(pin)

        // Listeners dos botões no InfoWindow (via evento DOM)
        google.maps.event.addListenerOnce(iw, 'domready', () => {
          const btnDetalhes = document.getElementById(`iw-detalhes-${pin.controle.id}`)
          const btnEnviar   = document.getElementById(`iw-enviar-${pin.controle.id}`)
          btnDetalhes?.addEventListener('click', () => {
            iw.close(); onSelectControle(pin.controle); fechar()
          })
          btnEnviar?.addEventListener('click', () => {
            iw.close(); setModalEnvio(pin)
          })
        })
      })

      bounds.extend(pin.coords)
      newMarkers.push(marker)
    }

    markersRef.current = newMarkers

    // Clustering
    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({ map, markers: newMarkers })
    } else {
      clustererRef.current.addMarkers(newMarkers)
    }

    // fitBounds após geocoding terminar (não durante loading incremental)
    if (!geocoding) {
      if (pins.length === 1) {
        map.setCenter(pins[0].coords)
        map.setZoom(13)
      } else if (pins.length > 1) {
        map.fitBounds(bounds, 60)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, isLoaded, geocoding])

  function buildInfoWindowContent(pin: PinData): string {
    return `
      <div style="background:#182818;color:#e8e0d0;padding:0.75rem 0.875rem;min-width:220px;font-family:Inter,sans-serif;font-size:0.8125rem;border-radius:4px;line-height:1.45">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:0.875rem;font-weight:700;color:${pin.cor};margin-bottom:0.25rem">
          ${pin.controle.id_container}
        </div>
        <div style="font-weight:600;margin-bottom:0.2rem">${pin.controle.cliente}</div>
        ${pin.cliente?.endereco ? `<div style="color:#8a9a8a;font-size:0.75rem">${pin.cliente.endereco}</div>` : ''}
        ${pin.cliente?.bairro_cidade ? `<div style="color:#8a9a8a;font-size:0.75rem;margin-bottom:0.375rem">${pin.cliente.bairro_cidade}</div>` : ''}
        <div style="display:inline-block;padding:0.1rem 0.45rem;border-radius:9999px;background:${pin.cor}25;color:${pin.cor};font-size:0.65rem;font-weight:700;margin-bottom:0.625rem">
          ${pin.status}
        </div>
        <div style="display:flex;gap:0.375rem">
          <button id="iw-detalhes-${pin.controle.id}" style="flex:1;background:#1e3a1e;color:#8a9a8a;border:1px solid #2d4a2d;border-radius:4px;padding:0.3rem 0.5rem;font-size:0.72rem;cursor:pointer">
            Ver detalhes
          </button>
          <button id="iw-enviar-${pin.controle.id}" style="flex:1;background:#1e2e3a;color:#7a9a8a;border:1px solid #2d3a4a;border-radius:4px;padding:0.3rem 0.5rem;font-size:0.72rem;cursor:pointer">
            📍 Enviar loc.
          </button>
        </div>
      </div>
    `
  }

  const estadosUnicos = useMemo(() => {
    const set = new Set<string>()
    pins.forEach(p => {
      const bc = p.cliente?.bairro_cidade ?? ''
      // Tenta extrair UF do padrão "Cidade - UF" ou "Cidade/UF"
      const match = bc.match(/[-/]\s*([A-Z]{2})\s*$/)
      if (match) set.add(match[1])
      else if (bc) set.add('BR')
    })
    return set.size
  }, [pins])

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
              OPERAÇÃO · BRASIL
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
                center={BRASIL_CENTER}
                zoom={4}
                options={mapOptions as object}
                onLoad={map => { mapRef.current = map }}
                onUnmount={() => { mapRef.current = null }}
              />

              {/* Aviso de endereços não localizados */}
              {naoLocalizados > 0 && !geocoding && (
                <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, background: 'hsl(22 68% 30% / 0.9)', border: '1px solid hsl(22 68% 52% / 0.4)', borderRadius: '9999px', padding: '0.25rem 0.75rem', fontSize: '0.65rem', color: 'hsl(22 68% 80%)', fontFamily: 'var(--font-mono)', backdropFilter: 'blur(8px)' }}>
                  ⚠ {naoLocalizados} endereço{naoLocalizados > 1 ? 's' : ''} não localizado{naoLocalizados > 1 ? 's' : ''}
                </div>
              )}

              {/* Contador ao vivo */}
              <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, pointerEvents: 'none', background: 'hsl(145 14% 9% / 0.9)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-soft)', borderRadius: '9999px', padding: '0.3rem 0.8rem', fontSize: '0.7rem', fontWeight: 600, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                {pins.length} CONTAINERS AO VIVO{estadosUnicos > 1 ? ` · ${estadosUnicos} ESTADOS` : ''}
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
