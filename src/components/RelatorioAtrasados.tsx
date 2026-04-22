import { Controle } from '../services/dataService'
import Icon from './Icon'

interface Props {
  atrasados: Controle[]
  onClose: () => void
}

function diasAtraso(data: string | null): number {
  if (!data) return 0
  const hoje = new Date().toISOString().slice(0, 10)
  return Math.floor((new Date(hoje).getTime() - new Date(data).getTime()) / 86400000)
}

function fmtData(d: string | null): string {
  if (!d) return '—'
  return d.split('-').reverse().join('/')
}

function agora() {
  const now = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(now.getDate())}/${p(now.getMonth() + 1)}/${now.getFullYear()} ${p(now.getHours())}:${p(now.getMinutes())}`
}

export default function RelatorioAtrasados({ atrasados, onClose }: Props) {
  const lista = [...atrasados].sort((a, b) => diasAtraso(b.previsao_retirada!) - diasAtraso(a.previsao_retirada!))
  const geradoEm = agora()
  const maiorAtraso = lista.length > 0 ? diasAtraso(lista[0].previsao_retirada!) : 0
  const logoUrl = window.location.origin + '/logo.svg'

  function imprimir() {
    const linhas = lista.map((c, i) => {
      const dias = diasAtraso(c.previsao_retirada!)
      const corDias = dias > 14 ? '#c0392b' : dias > 7 ? '#d35400' : '#7d6608'
      const bgLinha = i % 2 === 1 ? 'background:#f7f7f7;' : ''
      return `
        <tr style="${bgLinha}">
          <td style="padding:5px 6px;border-bottom:1px solid #e0e0e0;color:#888;font-weight:600;">${i + 1}</td>
          <td style="padding:5px 6px;border-bottom:1px solid #e0e0e0;font-weight:600;">${c.cliente}</td>
          <td style="padding:5px 6px;border-bottom:1px solid #e0e0e0;">${c.telefone_cliente || '—'}</td>
          <td style="padding:5px 6px;border-bottom:1px solid #e0e0e0;font-family:monospace;font-weight:700;">${c.id_container}</td>
          <td style="padding:5px 6px;border-bottom:1px solid #e0e0e0;">${fmtData(c.previsao_retirada!)}</td>
          <td style="padding:5px 6px;border-bottom:1px solid #e0e0e0;text-align:center;font-weight:800;color:${corDias};">${dias}</td>
          <td style="padding:5px 6px;border-bottom:1px solid #e0e0e0;color:#aaa;">—</td>
          <td style="padding:5px 6px;border-bottom:1px solid #e0e0e0;font-size:8pt;color:#555;">${c.observacao || '—'}</td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório de Atrasados — Trans Ambiental</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      color: #000;
      background: #fff;
      padding: 14mm 16mm 22mm;
    }
    @media print {
      body { padding: 14mm 16mm 22mm; }
      @page { size: A4 portrait; margin: 0; }
    }
    .header      { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
    .header-right { text-align: right; font-size: 8.5pt; color: #444; }
    .divider     { border: none; border-top: 1.5px solid #222; margin: 6px 0; }
    .title       { font-size: 15pt; font-weight: 800; letter-spacing: 0.04em; text-align: center; margin: 6px 0 2px; }
    .subtitle    { font-size: 8.5pt; color: #666; text-align: center; margin-bottom: 10px; }
    table        { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-top: 8px; }
    thead th     { background: #111; color: #fff; padding: 5px 6px; text-align: left; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .total-box   { margin-top: 14px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; padding: 6px 10px; display: flex; gap: 32px; font-size: 9pt; }
    .footer      { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 4px; display: flex; justify-content: space-between; font-size: 7.5pt; color: #777; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${logoUrl}" alt="Trans Ambiental" style="width:80px;height:auto;" />
    <div class="header-right">
      <div style="font-weight:700;font-size:10pt;">TRANS AMBIENTAL</div>
      <div>Controle de Containers</div>
    </div>
  </div>

  <hr class="divider" />

  <div class="title">RELATÓRIO DE CLIENTES EM ATRASO</div>
  <div class="subtitle">Gerado em: ${geradoEm}</div>

  <hr class="divider" />

  <table>
    <thead>
      <tr>
        <th style="width:28px;">Nº</th>
        <th>Nome do Cliente</th>
        <th style="width:100px;">Telefone</th>
        <th style="width:70px;">Container</th>
        <th style="width:76px;">Vencimento</th>
        <th style="width:64px;text-align:center;">Dias em Atraso</th>
        <th style="width:74px;">Valor em Aberto</th>
        <th>Observações</th>
      </tr>
    </thead>
    <tbody>
      ${linhas}
    </tbody>
  </table>

  <div class="total-box">
    <span><strong>Total de clientes em atraso:</strong> <span style="color:#c0392b;font-weight:800;">${lista.length}</span></span>
    <span><strong>Maior atraso:</strong> <span style="color:#c0392b;font-weight:800;">${maiorAtraso} dias</span></span>
  </div>

  <div class="footer">
    <span>TRANS AMBIENTAL — Controle de Containers</span>
    <span>Gerado em: ${geradoEm}</span>
    <span>Total: ${lista.length} cliente(s) em atraso</span>
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) {
      alert('O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.')
      return
    }
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="alert" size={18} color="var(--destructive)" />
            <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 600 }}>Relatório de Atrasados</h2>
          </div>
          <button className="btn-ghost" style={{ padding: '0.25rem' }} onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        {/* Preview resumido */}
        <div style={{
          background: 'hsl(220,25%,11%)',
          border: '1px solid hsl(220,25%,18%)',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1rem',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Prévia do relatório</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--destructive)', lineHeight: 1 }}>{lista.length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', marginTop: '0.125rem' }}>clientes em atraso</div>
            </div>
            {lista.length > 0 && (
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)', lineHeight: 1 }}>{maiorAtraso}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', marginTop: '0.125rem' }}>dias (maior atraso)</div>
              </div>
            )}
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>Gerado em</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg)' }}>{geradoEm}</div>
            </div>
          </div>
        </div>

        {/* Lista resumida */}
        {lista.length > 0 && (
          <div style={{ maxHeight: '260px', overflowY: 'auto', marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(220,25%,18%)' }}>
                  <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Cliente</th>
                  <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Container</th>
                  <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Atraso</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(c => {
                  const dias = diasAtraso(c.previsao_retirada!)
                  const cor = dias > 14 ? 'var(--destructive)' : dias > 7 ? 'var(--warning)' : 'hsl(38,92%,65%)'
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
            <Icon name="printer" size={15} /> Imprimir Relatório
          </button>
        </div>
      </div>
    </div>
  )
}
