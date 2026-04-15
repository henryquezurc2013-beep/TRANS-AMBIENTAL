import { Controle } from '../services/dataService'
import { Printer, X, AlertTriangle } from 'lucide-react'

interface Props {
  atrasados: Controle[]
  onClose: () => void
}

function diasAtraso(data: string) {
  const hoje = new Date().toISOString().slice(0, 10)
  return Math.floor((new Date(hoje).getTime() - new Date(data).getTime()) / 86400000)
}

function fmtData(d: string) {
  return d.split('-').reverse().join('/')
}

function agora() {
  const now = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(now.getDate())}/${p(now.getMonth() + 1)}/${now.getFullYear()} ${p(now.getHours())}:${p(now.getMinutes())}`
}

export default function RelatorioAtrasados({ atrasados, onClose }: Props) {
  // Ordena por dias em atraso — maior para menor
  const lista = [...atrasados].sort((a, b) => diasAtraso(b.previsao_retirada) - diasAtraso(a.previsao_retirada))
  const geradoEm = agora()

  function imprimir() {
    window.print()
  }

  return (
    <>
      {/* ── Estilos de impressão ──────────────────────────────────────────── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #relatorio-atrasados-print { display: block !important; }

          #relatorio-atrasados-print {
            position: fixed;
            top: 0; left: 0;
            width: 210mm;
            min-height: 297mm;
            padding: 14mm 16mm 20mm;
            background: #fff;
            color: #000;
            font-family: Arial, sans-serif;
            font-size: 10pt;
            box-sizing: border-box;
          }

          .ra-logo        { width: 80px; height: auto; }
          .ra-divider     { border: none; border-top: 1.5px solid #222; margin: 6px 0; }
          .ra-divider-sm  { border: none; border-top: 1px solid #ccc; margin: 4px 0; }
          .ra-header      { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
          .ra-header-right { text-align: right; font-size: 8.5pt; color: #444; }
          .ra-title       { font-size: 15pt; font-weight: 800; letter-spacing: 0.04em; text-align: center; margin: 6px 0 2px; }
          .ra-subtitle    { font-size: 8.5pt; color: #666; text-align: center; margin-bottom: 10px; }

          .ra-table       { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
          .ra-table th    { background: #111; color: #fff; padding: 5px 6px; text-align: left; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
          .ra-table td    { padding: 5px 6px; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
          .ra-table tr:nth-child(even) td { background: #f7f7f7; }

          .ra-dias-alto   { color: #c0392b; font-weight: 800; }
          .ra-dias-medio  { color: #d35400; font-weight: 700; }
          .ra-dias-baixo  { color: #7d6608; font-weight: 600; }

          .ra-footer-fixed {
            position: fixed;
            bottom: 10mm;
            left: 16mm;
            right: 16mm;
            border-top: 1px solid #ccc;
            padding-top: 4px;
            font-size: 7.5pt;
            color: #777;
            display: flex;
            justify-content: space-between;
          }

          .ra-total-box {
            margin-top: 14px;
            background: #f0f0f0;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 6px 10px;
            display: flex;
            gap: 24px;
            font-size: 9pt;
          }
          .ra-total-label { color: #555; font-weight: 600; }
          .ra-total-value { font-weight: 800; color: #c0392b; }
        }

        @media screen {
          #relatorio-atrasados-print { display: none; }
        }
      `}</style>

      {/* ── Área de impressão (oculta na tela) ───────────────────────────── */}
      <div id="relatorio-atrasados-print">
        <div className="ra-header">
          <img src="/logo.svg" className="ra-logo" alt="Trans Ambiental" />
          <div className="ra-header-right">
            <div style={{ fontWeight: 700, fontSize: '10pt' }}>TRANS AMBIENTAL</div>
            <div>Controle de Containers</div>
          </div>
        </div>

        <hr className="ra-divider" />

        <div className="ra-title">RELATÓRIO DE CLIENTES EM ATRASO</div>
        <div className="ra-subtitle">Gerado em: {geradoEm}</div>

        <hr className="ra-divider" />

        <table className="ra-table">
          <thead>
            <tr>
              <th style={{ width: '28px' }}>Nº</th>
              <th>Nome do Cliente</th>
              <th style={{ width: '100px' }}>Telefone</th>
              <th style={{ width: '68px' }}>Container</th>
              <th style={{ width: '76px' }}>Vencimento</th>
              <th style={{ width: '60px', textAlign: 'center' }}>Dias em Atraso</th>
              <th style={{ width: '72px' }}>Valor em Aberto</th>
              <th>Observações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c, i) => {
              const dias = diasAtraso(c.previsao_retirada)
              const classDias = dias > 14 ? 'ra-dias-alto' : dias > 7 ? 'ra-dias-medio' : 'ra-dias-baixo'
              return (
                <tr key={c.id}>
                  <td style={{ color: '#888', fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{c.cliente}</td>
                  <td>{c.telefone_cliente || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.id_container}</td>
                  <td>{fmtData(c.previsao_retirada)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={classDias}>{dias}</span>
                  </td>
                  <td style={{ color: '#888' }}>—</td>
                  <td style={{ color: '#555', fontSize: '8pt' }}>{c.observacao || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="ra-total-box">
          <span><span className="ra-total-label">Total de clientes em atraso: </span><span className="ra-total-value">{lista.length}</span></span>
          <span><span className="ra-total-label">Maior atraso: </span><span className="ra-total-value">{lista.length > 0 ? diasAtraso(lista[0].previsao_retirada) : 0} dias</span></span>
        </div>

        <div className="ra-footer-fixed">
          <span>TRANS AMBIENTAL — Controle de Containers</span>
          <span>Gerado em: {geradoEm}</span>
          <span>Total: {lista.length} cliente(s) em atraso</span>
        </div>
      </div>

      {/* ── Modal na tela ────────────────────────────────────────────────── */}
      <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="modal-content" style={{ maxWidth: '500px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} color="hsl(0,84%,60%)" />
              <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 600 }}>Relatório de Atrasados</h2>
            </div>
            <button className="btn-ghost" style={{ padding: '0.25rem' }} onClick={onClose}><X size={18} /></button>
          </div>

          {/* Preview resumido */}
          <div style={{
            background: 'hsl(220,25%,11%)',
            border: '1px solid hsl(220,25%,18%)',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
          }}>
            <div style={{ fontSize: '0.75rem', color: 'hsl(210,20%,45%)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Prévia do relatório</div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'hsl(0,84%,60%)', lineHeight: 1 }}>{lista.length}</div>
                <div style={{ fontSize: '0.7rem', color: 'hsl(210,20%,50%)', marginTop: '0.125rem' }}>clientes em atraso</div>
              </div>
              {lista.length > 0 && (
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'hsl(38,92%,50%)', lineHeight: 1 }}>{diasAtraso(lista[0].previsao_retirada)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'hsl(210,20%,50%)', marginTop: '0.125rem' }}>dias (maior atraso)</div>
                </div>
              )}
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'hsl(210,20%,55%)' }}>Gerado em</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(210,20%,80%)' }}>{geradoEm}</div>
              </div>
            </div>
          </div>

          {/* Lista resumida */}
          {lista.length > 0 && (
            <div style={{ maxHeight: '260px', overflowY: 'auto', marginBottom: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(220,25%,18%)' }}>
                    <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontSize: '0.7rem', color: 'hsl(210,20%,45%)', fontWeight: 600, textTransform: 'uppercase' }}>Cliente</th>
                    <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontSize: '0.7rem', color: 'hsl(210,20%,45%)', fontWeight: 600, textTransform: 'uppercase' }}>Container</th>
                    <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontSize: '0.7rem', color: 'hsl(210,20%,45%)', fontWeight: 600, textTransform: 'uppercase' }}>Atraso</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map(c => {
                    const dias = diasAtraso(c.previsao_retirada)
                    const cor = dias > 14 ? 'hsl(0,84%,60%)' : dias > 7 ? 'hsl(38,92%,50%)' : 'hsl(38,92%,65%)'
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid hsl(220,25%,14%)' }}>
                        <td style={{ padding: '0.375rem 0.5rem', fontWeight: 500 }}>{c.cliente}</td>
                        <td style={{ padding: '0.375rem 0.5rem' }}>
                          <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{c.id_container}</span>
                        </td>
                        <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontWeight: 700, color: cor }}>{dias}d</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'hsl(0,84%,55%)' }}
              onClick={imprimir}
            >
              <Printer size={15} /> Imprimir Relatório
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
