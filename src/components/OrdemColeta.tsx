import { useEffect, useRef, useState } from 'react'
import { Printer, X, ClipboardList } from 'lucide-react'
import { db, Cliente } from '../services/dataService'

interface Props {
  onClose: () => void
}

function gerarNumero() {
  const now = new Date()
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  return `OC-${now.getFullYear()}${p(now.getMonth()+1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
}

function agora() {
  const now = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`
}

export default function OrdemColeta({ onClose }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [numero]    = useState(gerarNumero)
  const [dataHora, setDataHora]             = useState(agora)
  const [motorista, setMotorista]           = useState('')
  const [clienteNome, setClienteNome]       = useState('')
  const [endereco, setEndereco]             = useState('')
  const [containerRetirar, setContainerRetirar] = useState('')
  const [containerEntregar, setContainerEntregar] = useState('')
  const [observacoes, setObservacoes]       = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    db.clientes.getAll().then(setClientes)
  }, [])

  function handleClienteChange(nome: string) {
    setClienteNome(nome)
    const c = clientes.find(cl => cl.nome_cliente === nome)
    if (c) setEndereco([c.endereco, c.bairro_cidade].filter(Boolean).join(', '))
    else setEndereco('')
  }

  function imprimir() {
    window.print()
  }

  const dtFormatada = dataHora
    ? new Date(dataHora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <>
      {/* ── Estilos de impressão ──────────────────────────────────────────── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #ordem-coleta-print { display: block !important; }

          #ordem-coleta-print {
            position: fixed;
            top: 0; left: 0;
            width: 210mm;
            min-height: 297mm;
            padding: 16mm 18mm;
            background: #fff;
            color: #000;
            font-family: Arial, sans-serif;
            font-size: 11pt;
            box-sizing: border-box;
          }

          .oc-logo       { width: 90px; height: auto; }
          .oc-divider    { border: none; border-top: 1.5px solid #222; margin: 6px 0; }
          .oc-divider-sm { border: none; border-top: 1px solid #ccc; margin: 4px 0; }
          .oc-grid-2     { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
          .oc-grid-3     { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 16px; }
          .oc-label      { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #555; margin-bottom: 2px; }
          .oc-value      { font-size: 10.5pt; font-weight: 600; color: #111; min-height: 18px; border-bottom: 1px solid #bbb; padding-bottom: 2px; }
          .oc-blank      { min-height: 22px; border-bottom: 1.5px solid #333; }
          .oc-sig-area   { min-height: 48px; border-bottom: 1.5px solid #333; margin-top: 4px; }
          .oc-section    { margin-bottom: 14px; }
          .oc-title      { font-size: 16pt; font-weight: 800; letter-spacing: 0.04em; text-align: center; margin: 8px 0 4px; }
          .oc-subtitle   { font-size: 9pt; color: #555; text-align: center; margin-bottom: 10px; }
          .oc-badge      { display: inline-block; background: #111; color: #fff; padding: 2px 10px; border-radius: 20px; font-size: 9pt; font-weight: 700; }
          .oc-footer     { position: fixed; bottom: 12mm; left: 18mm; right: 18mm; display: flex; justify-content: space-between; font-size: 8pt; color: #777; border-top: 1px solid #ccc; padding-top: 4px; }
          .oc-obs-box    { border: 1px solid #ccc; border-radius: 4px; padding: 6px; min-height: 40px; font-size: 10pt; }
          .oc-header     { display: flex; justify-content: space-between; align-items: flex-start; }
          .oc-header-right { text-align: right; font-size: 9pt; color: #444; }
        }

        @media screen {
          #ordem-coleta-print { display: none; }
        }
      `}</style>

      {/* ── Área de impressão (oculta na tela) ───────────────────────────── */}
      <div id="ordem-coleta-print" ref={printRef}>
        <div className="oc-header">
          <img src="/logo.svg" className="oc-logo" alt="Trans Ambiental" />
          <div className="oc-header-right">
            <div style={{ fontWeight: 700, fontSize: '10pt' }}>TRANS AMBIENTAL</div>
            <div>Controle de Containers</div>
          </div>
        </div>

        <hr className="oc-divider" />

        <div className="oc-title">ORDEM DE COLETA</div>
        <div className="oc-subtitle">
          <span className="oc-badge">{numero}</span>
          &nbsp;&nbsp;{dtFormatada}
        </div>

        <hr className="oc-divider" />

        {/* Motorista */}
        <div className="oc-section">
          <div style={{ fontWeight: 700, fontSize: '9pt', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', color: '#333' }}>Motorista</div>
          <div className="oc-grid-2">
            <div>
              <div className="oc-label">Nome do Motorista</div>
              <div className="oc-value">{motorista || ' '}</div>
            </div>
            <div>
              <div className="oc-label">Horário da Coleta</div>
              <div className="oc-blank" />
            </div>
          </div>
        </div>

        <hr className="oc-divider-sm" />

        {/* Cliente */}
        <div className="oc-section">
          <div style={{ fontWeight: 700, fontSize: '9pt', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', color: '#333' }}>Dados do Cliente</div>
          <div style={{ marginBottom: '8px' }}>
            <div className="oc-label">Nome / Razão Social</div>
            <div className="oc-value">{clienteNome || ' '}</div>
          </div>
          <div>
            <div className="oc-label">Endereço Completo</div>
            <div className="oc-value">{endereco || ' '}</div>
          </div>
        </div>

        <hr className="oc-divider-sm" />

        {/* Containers */}
        <div className="oc-section">
          <div style={{ fontWeight: 700, fontSize: '9pt', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', color: '#333' }}>Containers</div>
          <div className="oc-grid-2">
            <div style={{ border: '1.5px solid #333', borderRadius: '4px', padding: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '9pt', marginBottom: '6px' }}>📤 CONTAINER A RETIRAR</div>
              <div className="oc-label">Identificação / Número</div>
              {containerRetirar
                ? <div className="oc-value">{containerRetirar}</div>
                : <div className="oc-blank" />
              }
            </div>
            <div style={{ border: '1.5px dashed #555', borderRadius: '4px', padding: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '9pt', marginBottom: '6px' }}>📥 CONTAINER A ENTREGAR</div>
              <div className="oc-label">Identificação / Número</div>
              {containerEntregar
                ? <div className="oc-value">{containerEntregar}</div>
                : <div className="oc-blank" />
              }
            </div>
          </div>
        </div>

        <hr className="oc-divider-sm" />

        {/* Observações */}
        <div className="oc-section">
          <div className="oc-label" style={{ marginBottom: '4px' }}>Observações</div>
          <div className="oc-obs-box">{observacoes || ' '}</div>
        </div>

        <hr className="oc-divider-sm" />

        {/* Assinaturas */}
        <div className="oc-section" style={{ marginTop: '10px' }}>
          <div style={{ fontWeight: 700, fontSize: '9pt', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', color: '#333' }}>Assinaturas</div>
          <div className="oc-grid-2" style={{ gap: '24px' }}>
            <div>
              <div className="oc-sig-area" />
              <div style={{ textAlign: 'center', fontSize: '9pt', marginTop: '4px', color: '#555' }}>Assinatura do Cliente</div>
            </div>
            <div>
              <div className="oc-sig-area" />
              <div style={{ textAlign: 'center', fontSize: '9pt', marginTop: '4px', color: '#555' }}>Assinatura do Motorista</div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="oc-footer">
          <span>Gerado em: {dtFormatada}</span>
          <span>{numero}</span>
          <span>TRANS AMBIENTAL — Controle de Containers</span>
        </div>
      </div>

      {/* ── Modal na tela ────────────────────────────────────────────────── */}
      <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="modal-content" style={{ maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardList size={18} color="hsl(217,91%,60%)" />
              <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 600 }}>Ordem de Coleta</h2>
            </div>
            <button className="btn-ghost" style={{ padding: '0.25rem' }} onClick={onClose}><X size={18} /></button>
          </div>

          {/* Número e data */}
          <div style={{
            background: 'hsl(220,25%,11%)',
            border: '1px solid hsl(220,25%,18%)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
          }}>
            <div>
              <span style={{ color: 'hsl(210,20%,45%)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Número da Ordem</span>
              <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'hsl(217,91%,65%)' }}>{numero}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <label className="form-label" style={{ display: 'block' }}>Data e Hora</label>
              <input className="input-field" type="datetime-local" value={dataHora} onChange={e => setDataHora(e.target.value)} style={{ width: '200px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

            {/* Motorista */}
            <div className="form-group">
              <label className="form-label">Nome do Motorista</label>
              <input className="input-field" placeholder="Nome completo do motorista" value={motorista} onChange={e => setMotorista(e.target.value)} />
            </div>

            {/* Cliente */}
            <div className="form-group">
              <label className="form-label">Cliente</label>
              <select className="select-field" value={clienteNome} onChange={e => handleClienteChange(e.target.value)}>
                <option value="">Selecionar cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.nome_cliente}>{c.nome_cliente}</option>)}
              </select>
            </div>

            {/* Endereço */}
            <div className="form-group">
              <label className="form-label">Endereço do Cliente</label>
              <input className="input-field" placeholder="Preenchido automaticamente ao selecionar o cliente" value={endereco} onChange={e => setEndereco(e.target.value)} />
            </div>

            {/* Containers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <div className="form-group">
                <label className="form-label">Container a Retirar</label>
                <input className="input-field" placeholder="ID do container (ex: C-001)" value={containerRetirar} onChange={e => setContainerRetirar(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Container a Entregar</label>
                <input className="input-field" placeholder="ID do container (ex: C-002)" value={containerEntregar} onChange={e => setContainerEntregar(e.target.value)} />
              </div>
            </div>

            {/* Observações */}
            <div className="form-group">
              <label className="form-label">Observações <span style={{ color: 'hsl(210,20%,40%)', fontWeight: 400 }}>(opcional)</span></label>
              <input className="input-field" placeholder="Instruções adicionais para o motorista..." value={observacoes} onChange={e => setObservacoes(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }} onClick={imprimir}>
              <Printer size={15} /> Imprimir Ordem
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
