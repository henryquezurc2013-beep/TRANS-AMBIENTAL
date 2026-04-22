import Icon from './Icon'

interface Props {
  onClose: () => void
}

const NUM_LINHAS = 15

function gerarHtml(): string {
  const linhas = Array.from({ length: NUM_LINHAS }, (_, i) => `
    <tr>
      <td class="cel-num">${i + 1}</td>
      <td class="cel"></td>
      <td class="cel"></td>
      <td class="cel-cc"></td>
      <td class="cel-cc"></td>
      <td class="cel-ass"></td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Controle de Caçamba — Trans Ambiental</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      background: #fff;
      padding: 16mm 14mm 14mm;
    }

    /* ── Cabeçalho ── */
    .cabecalho {
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .logo-box {
      width: 62px; height: 62px; flex-shrink: 0;
      border: 2px solid #000; border-radius: 6px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-size: 8px; font-weight: 900; text-align: center;
      line-height: 1.15; letter-spacing: 0.04em;
    }
    .cab-titulo { flex: 1; text-align: center; }
    .cab-titulo h1 {
      font-size: 17px; font-weight: 900;
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .cab-titulo h2 {
      font-size: 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.08em;
      margin-top: 2px;
    }

    /* ── Campos de preenchimento ── */
    .campos {
      margin: 10px 0 12px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .linha-campo {
      display: flex; gap: 24px; align-items: flex-end;
    }
    .campo {
      display: flex; align-items: flex-end; gap: 5px;
      font-size: 11px; font-weight: 700;
    }
    .campo-linha {
      border-bottom: 1px solid #000;
      min-width: 140px; height: 16px;
      flex: 1;
    }
    .campo-linha.lg { min-width: 200px; }
    .campo-linha.md { min-width: 120px; }
    .campo-linha.sm { min-width: 80px; }

    /* ── Tabela ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    thead tr { background: #000; color: #fff; }
    thead th {
      padding: 5px 6px;
      font-size: 9px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em;
      text-align: center; border: 1px solid #000;
    }
    th.th-cliente, th.th-end { text-align: left; }

    tbody td {
      border: 1px solid #000;
      height: 45px;
      vertical-align: top;
      padding: 3px 5px;
    }
    .cel-num { width: 28px; text-align: center; font-weight: 700; font-size: 10px; vertical-align: middle; }
    .cel      { width: auto; }
    .cel-cc   { width: 88px; }
    .cel-ass  { width: 130px; }

    /* ── Rodapé ── */
    .rodape { margin-top: 6px; }
    .rodape-linha {
      display: flex; gap: 32px; margin-bottom: 18px;
    }
    .rodape-campo {
      display: flex; align-items: flex-end; gap: 5px;
      font-size: 11px; font-weight: 700; flex: 1;
    }
    .rodape-campo .campo-linha { min-width: 80px; }
    .rodape-obs {
      font-size: 11px; font-weight: 700;
      margin-bottom: 4px;
    }
    .linha-obs {
      border-bottom: 1px solid #000;
      margin-bottom: 8px; height: 16px;
    }
    .rodape-assinatura {
      display: flex; justify-content: flex-end;
      margin-top: 14px;
    }
    .assinatura-box {
      text-align: center; width: 260px;
    }
    .assinatura-linha {
      border-top: 1px solid #000;
      padding-top: 3px;
      font-size: 10px;
    }
    .site {
      margin-top: 16px; text-align: center;
      font-size: 9px; color: #555;
      border-top: 1px solid #ccc; padding-top: 6px;
    }

    /* ── Botões (ocultos na impressão) ── */
    .no-print {
      margin-bottom: 14px;
    }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 18px; border-radius: 6px; border: none;
      font-size: 12px; font-weight: 700; cursor: pointer;
      margin-right: 8px;
    }
    .btn-print { background: #000; color: #fff; }
    .btn-close { background: #e5e7eb; color: #374151; }

    @media print {
      .no-print { display: none !important; }
      body { padding: 12mm 12mm 10mm; }
      @page { size: A4 portrait; margin: 0; }
    }
  </style>
</head>
<body>

  <div class="no-print">
    <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir</button>
    <button class="btn btn-close" onclick="window.close()">✕ Fechar</button>
  </div>

  <!-- CABEÇALHO -->
  <div class="cabecalho">
    <div class="logo-box">TRANS<br>AMBIENTAL</div>
    <div class="cab-titulo">
      <h1>Trans Ambiental</h1>
      <h2>Controle de Caçamba · Folha de Rota</h2>
    </div>
    <div style="width:62px"></div>
  </div>

  <!-- CAMPOS -->
  <div class="campos">
    <div class="linha-campo">
      <div class="campo">Data: <div class="campo-linha md"></div></div>
      <div class="campo" style="flex:1">Motorista: <div class="campo-linha lg"></div></div>
    </div>
    <div class="linha-campo">
      <div class="campo">Placa do veículo: <div class="campo-linha sm"></div></div>
      <div class="campo" style="flex:1">Rota: <div class="campo-linha"></div></div>
    </div>
  </div>

  <!-- TABELA -->
  <table>
    <thead>
      <tr>
        <th style="width:28px">Nº</th>
        <th class="th-cliente" style="width:22%">Cliente</th>
        <th class="th-end">Endereço</th>
        <th style="width:88px">Caçamba<br>Retirada</th>
        <th style="width:88px">Caçamba<br>Entregue</th>
        <th style="width:130px">Assinatura<br>do Cliente</th>
      </tr>
    </thead>
    <tbody>
      ${linhas}
    </tbody>
  </table>

  <!-- RODAPÉ -->
  <div class="rodape">
    <div class="rodape-linha">
      <div class="rodape-campo">Total de operações: <div class="campo-linha sm"></div></div>
    </div>
    <div class="rodape-obs">Observações:</div>
    <div class="linha-obs"></div>
    <div class="linha-obs"></div>
    <div class="rodape-assinatura">
      <div class="assinatura-box">
        <div style="height:32px"></div>
        <div class="assinatura-linha">Assinatura do Motorista</div>
      </div>
    </div>
    <div class="site">Trans Ambiental · www.transambientalcontainer.com.br</div>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`
}

export default function RelatorioMotorista({ onClose }: Props) {
  function abrir() {
    const win = window.open('', '_blank', 'width=900,height=750')
    if (win) {
      win.document.write(gerarHtml())
      win.document.close()
    }
    onClose()
  }

  return (
    <>
      <div className="drawer-backdrop" style={{ zIndex: 399 }} onClick={onClose} />
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
          width: '100%', maxWidth: '360px',
          pointerEvents: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
                FORMULÁRIO IMPRIMÍVEL
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', color: 'var(--fg)' }}>
                Folha de Rota do Motorista
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--fg-dim)', marginTop: '0.25rem' }}>
                15 linhas em branco · A4 retrato · preto e branco
              </div>
            </div>
            <button className="btn-ghost" style={{ padding: '0.375rem' }} onClick={onClose}>
              <Icon name="x" size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" style={{ flex: 2 }} onClick={abrir}>
              🖨️ Abrir para Imprimir
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
