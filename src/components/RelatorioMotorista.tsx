import { useState } from 'react'
import { db, Controle, Cliente } from '../services/dataService'
import Icon from './Icon'

interface Props {
  onClose: () => void
}

const hoje = new Date().toISOString().slice(0, 10)

function fmtData(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function enderecoCliente(cli: Cliente | undefined, controle: Controle): string {
  if (cli?.endereco && cli.bairro_cidade) return `${cli.endereco}, ${cli.bairro_cidade}`
  if (cli?.endereco) return cli.endereco
  if (cli?.bairro_cidade) return cli.bairro_cidade
  return '—'
}

function gerarNumeroOrdem(data: string): string {
  const [y, m, d] = data.split('-')
  return `#${y}-${m}${d}`
}

function gerarHtml(
  data: string,
  motorista: string,
  entregas: Controle[],
  retiradas: Controle[],
  clientes: Cliente[],
): string {
  const ordem = gerarNumeroOrdem(data)
  const agora = new Date()
  const horaGerado = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`

  type Linha = {
    num: number
    cliente: string
    endereco: string
    cacambaRetirada: string
    cacambaEntregue: string
  }

  const linhas: Linha[] = []

  // Entregas do dia
  entregas.forEach((c, i) => {
    const cli = clientes.find(cl => cl.nome_cliente === c.cliente)
    linhas.push({
      num: i + 1,
      cliente: c.cliente,
      endereco: enderecoCliente(cli, c),
      cacambaRetirada: '',
      cacambaEntregue: c.id_container,
    })
  })

  // Retiradas do dia (que não são trocas — sem nova entrega no mesmo dia)
  const entregueSet = new Set(entregas.map(e => e.cliente))
  retiradas.forEach((c) => {
    // Se já tem entrega para o mesmo cliente, adiciona a retirada nessa linha
    const existente = linhas.find(l => l.cliente === c.cliente && l.cacambaRetirada === '')
    if (existente) {
      existente.cacambaRetirada = c.id_container
    } else if (!entregueSet.has(c.cliente)) {
      const cli = clientes.find(cl => cl.nome_cliente === c.cliente)
      linhas.push({
        num: linhas.length + 1,
        cliente: c.cliente,
        endereco: enderecoCliente(cli, c),
        cacambaRetirada: c.id_container,
        cacambaEntregue: '',
      })
    }
  })

  // Renumera
  linhas.forEach((l, i) => { l.num = i + 1 })

  // 5 linhas em branco extras
  const totalLinhas = linhas.length
  for (let i = 0; i < 5; i++) {
    linhas.push({ num: totalLinhas + i + 1, cliente: '', endereco: '', cacambaRetirada: '', cacambaEntregue: '' })
  }

  const linhasHtml = linhas.map(l => `
    <tr>
      <td style="text-align:center;font-weight:600">${l.num}</td>
      <td>${l.cliente}</td>
      <td>${l.endereco}</td>
      <td style="text-align:center;font-weight:600;color:#b45309">${l.cacambaRetirada}</td>
      <td style="text-align:center;font-weight:600;color:#166534">${l.cacambaEntregue}</td>
      <td></td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório do Motorista · ${fmtData(data)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #111;
      background: #fff;
      padding: 20px 24px;
    }
    .no-print { margin-bottom: 16px; }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 6px; border: none;
      font-size: 12px; font-weight: 600; cursor: pointer;
      margin-right: 8px;
    }
    .btn-print { background: #166534; color: #fff; }
    .btn-close { background: #f3f4f6; color: #374151; }

    /* Cabeçalho */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #111;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .logo-box {
      width: 60px; height: 60px;
      border: 2px solid #166534;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 700; color: #166534; text-align: center;
      line-height: 1.2;
    }
    .empresa-nome { font-size: 18px; font-weight: 800; color: #111; }
    .empresa-sub { font-size: 11px; color: #555; margin-top: 2px; }
    .header-right { text-align: right; }
    .ordem { font-size: 16px; font-weight: 700; color: #166534; }
    .header-info { font-size: 11px; color: #555; margin-top: 4px; line-height: 1.6; }

    /* Meta linha */
    .meta-bar {
      display: flex; gap: 24px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 8px 14px;
      margin-bottom: 14px;
    }
    .meta-item { display: flex; flex-direction: column; }
    .meta-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.08em; }
    .meta-value { font-size: 13px; font-weight: 700; color: #111; margin-top: 2px; }

    /* Tabela */
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    thead tr { background: #166534; color: #fff; }
    thead th {
      padding: 7px 8px;
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border: 1px solid #14532d;
    }
    thead th:first-child { text-align: center; width: 36px; }
    thead th:nth-child(4),
    thead th:nth-child(5) { text-align: center; width: 110px; }
    thead th:last-child { width: 120px; }

    tbody tr { border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td {
      padding: 9px 8px;
      vertical-align: middle;
      border: 1px solid #e5e7eb;
      min-height: 28px;
      height: 32px;
    }

    /* Rodapé */
    .footer {
      border-top: 1px solid #d1d5db;
      padding-top: 12px;
      margin-top: 4px;
    }
    .footer-grid { display: flex; justify-content: space-between; align-items: flex-end; }
    .total-ops { font-size: 12px; font-weight: 700; }
    .assinatura-box {
      text-align: center;
      border-top: 1px solid #111;
      padding-top: 4px;
      width: 240px;
      font-size: 10px;
      color: #374151;
    }
    .gerado-em {
      margin-top: 10px;
      font-size: 9px;
      color: #9ca3af;
      text-align: center;
    }

    @media print {
      .no-print { display: none !important; }
      body { padding: 10px 14px; }
      @page { size: A4 portrait; margin: 12mm; }
    }
  </style>
</head>
<body>

  <div class="no-print">
    <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir</button>
    <button class="btn btn-close" onclick="window.close()">✕ Fechar</button>
  </div>

  <!-- CABEÇALHO -->
  <div class="header">
    <div class="header-left">
      <div class="logo-box">TRANS<br>AMBIENTAL</div>
      <div>
        <div class="empresa-nome">TRANS AMBIENTAL</div>
        <div class="empresa-sub">Controle de Caçamba · Folha de Rota do Motorista</div>
      </div>
    </div>
    <div class="header-right">
      <div class="ordem">Nº ${ordem}</div>
      <div class="header-info">
        Data: <strong>${fmtData(data)}</strong><br>
        Motorista: <strong>${motorista || '___________________________'}</strong>
      </div>
    </div>
  </div>

  <!-- META BAR -->
  <div class="meta-bar">
    <div class="meta-item">
      <span class="meta-label">Data</span>
      <span class="meta-value">${fmtData(data)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Motorista</span>
      <span class="meta-value">${motorista || '—'}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Entregas</span>
      <span class="meta-value">${entregas.length}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Retiradas</span>
      <span class="meta-value">${retiradas.length}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Total operações</span>
      <span class="meta-value">${entregas.length + retiradas.length}</span>
    </div>
  </div>

  <!-- TABELA -->
  <table>
    <thead>
      <tr>
        <th>Nº</th>
        <th>Cliente</th>
        <th>Endereço</th>
        <th>Caçamba Retirada</th>
        <th>Caçamba Entregue</th>
        <th>Assinatura do Cliente</th>
      </tr>
    </thead>
    <tbody>
      ${linhasHtml}
    </tbody>
  </table>

  <!-- RODAPÉ -->
  <div class="footer">
    <div class="footer-grid">
      <div>
        <div class="total-ops">Total de operações: ${entregas.length + retiradas.length}</div>
      </div>
      <div class="assinatura-box">
        Assinatura do Motorista
      </div>
    </div>
    <div class="gerado-em">Trans Ambiental · Gerado em ${horaGerado} de ${fmtData(hoje)}</div>
  </div>

</body>
</html>`
}

export default function RelatorioMotorista({ onClose }: Props) {
  const [data, setData]           = useState(hoje)
  const [motorista, setMotorista] = useState('')
  const [gerando, setGerando]     = useState(false)

  async function gerar() {
    setGerando(true)
    try {
      const [todos, clientes] = await Promise.all([
        db.controle.getAll(),
        db.clientes.getAll(),
      ])

      const entregas  = todos.filter(c => c.data_entrega === data && c.data_retirada === null)
      const retiradas = todos.filter(c => c.data_retirada === data)

      const html = gerarHtml(data, motorista, entregas, retiradas, clientes)
      const win  = window.open('', '_blank', 'width=900,height=700')
      if (win) {
        win.document.write(html)
        win.document.close()
        setTimeout(() => win.print(), 800)
      }
      onClose()
    } finally {
      setGerando(false)
    }
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
          width: '100%', maxWidth: '400px',
          pointerEvents: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
                RELATÓRIO IMPRIMÍVEL
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', color: 'var(--fg)' }}>
                Folha de Rota do Motorista
              </div>
            </div>
            <button className="btn-ghost" style={{ padding: '0.375rem' }} onClick={onClose}>
              <Icon name="x" size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div className="form-group">
              <label className="form-label">Data das operações</label>
              <input className="input-field" type="date" value={data} onChange={e => setData(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Motorista</label>
              <input className="input-field" placeholder="Nome do motorista (opcional)" value={motorista} onChange={e => setMotorista(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" style={{ flex: 2 }} onClick={gerar} disabled={gerando}>
              {gerando ? 'Gerando...' : '🖨️ Gerar Relatório'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
