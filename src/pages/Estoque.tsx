import { useEffect, useState, useMemo } from 'react'
import { db, Container, Controle } from '../services/dataService'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'

type SortDir = 'asc' | 'desc' | 'none'
type SortCol = 'numero' | 'id_container' | 'status' | 'capacidade' | 'cliente'

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc')  return <span style={{ marginLeft: '0.25rem', opacity: 0.8 }}>↑</span>
  if (dir === 'desc') return <span style={{ marginLeft: '0.25rem', opacity: 0.8 }}>↓</span>
  return <span style={{ marginLeft: '0.25rem', opacity: 0.3 }}>↕</span>
}

export default function Estoque() {
  const [containers, setContainers] = useState<Container[]>([])
  const [controles, setControles]   = useState<Controle[]>([])
  const [movimentacoes, setMovimentacoes] = useState<Array<{ id_container: string | null; data_entrega: string | null }>>([])
  const [loading, setLoading]       = useState(true)
  const [busca, setBusca]           = useState('')
  const [filtro, setFiltro]         = useState('TODOS')
  const [sortCol, setSortCol]       = useState<SortCol>('numero')
  const [sortDir, setSortDir]       = useState<SortDir>('asc')

  useEffect(() => {
    async function carregar() {
      const [c, co, mov] = await Promise.all([
        db.containers.getAll(),
        db.controle.getEmAberto(),
        supabase
          .from('controle')
          .select('id_container, data_entrega')
          .order('created_at', { ascending: false }),
      ])
      setContainers(c)
      setControles(co)
      setMovimentacoes((mov.data ?? []) as Array<{ id_container: string | null; data_entrega: string | null }>)
      setLoading(false)
    }
    carregar()
  }, [])

  async function imprimirRelatorio() {
    const [todosContainers, registrosAbertos, todosClientes] = await Promise.all([
      db.containers.getAll(),
      db.controle.getEmAberto(),
      db.clientes.getAll(),
    ])

    const mapaClientes = new Map(
      todosClientes.map(c => [c.nome_cliente.trim().toUpperCase(), c])
    )

    function extrairCidade(bairroCidade: string | null | undefined): string {
      if (!bairroCidade || !bairroCidade.trim()) return '—'
      const partes = bairroCidade.trim()
        .split(/\s*[\/,–-]\s*/)
        .map(p => p.trim())
        .filter(Boolean)
      if (partes.length === 0) return '—'
      if (partes.length === 1) return partes[0]
      const ultima = partes[partes.length - 1]
      if (/^[A-Z]{2}$/.test(ultima)) return partes[partes.length - 2]
      return partes[partes.length - 1]
    }

    function resolverCidade(clienteNome: string | undefined | null): string {
      if (!clienteNome) return '—'
      const cliente = mapaClientes.get(clienteNome.trim().toUpperCase())
      if (!cliente) return '—'
      return extrairCidade(cliente.bairro_cidade)
    }

    const ordenados = [...todosContainers].sort((a, b) =>
      (a.id_container ?? '').toString().localeCompare(
        (b.id_container ?? '').toString(),
        'pt-BR',
        { numeric: true }
      )
    )

    const total = ordenados.length
    const emUso = ordenados.filter(c => (c.status_operacional ?? '').toUpperCase().includes('USO')).length
    const disponiveis = ordenados.filter(c => (c.status_operacional ?? '').toUpperCase().includes('DISPON')).length
    const manutencao = ordenados.filter(c => (c.status_operacional ?? '').toUpperCase().includes('MANUTEN')).length

    const formatDate = (d: string | null | undefined) =>
      d ? new Date(d).toLocaleDateString('pt-BR') : '—'

    const linhas = ordenados.map(c => {
      const ctrl = registrosAbertos.find(r => r.id_container === c.id_container)
      const statusRaw = (c.status_operacional ?? '').toString().toUpperCase()
      let statusKey = 'OUTRO'
      if (statusRaw.includes('USO')) statusKey = 'EMUSO'
      else if (statusRaw.includes('DISPON')) statusKey = 'DISPONIVEL'
      else if (statusRaw.includes('MANUTEN')) statusKey = 'MANUTENCAO'

      return `
        <tr>
          <td style="text-align:center;"><span class="checkbox"></span></td>
          <td class="num">${c.id_container ?? '-'}</td>
          <td><span class="status status-${statusKey}">${c.status_operacional ?? '-'}</span></td>
          <td>${ctrl?.cliente ?? '—'}</td>
          <td>${resolverCidade(ctrl?.cliente)}</td>
          <td>${formatDate(ctrl?.data_entrega)}</td>
          <td>${formatDate(ctrl?.previsao_retirada)}</td>
          <td>${c.local_patio ?? '-'}</td>
        </tr>
      `
    }).join('')

    const dataAtual = new Date().toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Estoque — Trans Ambiental</title>
<style>
  @page { size: A4; margin: 1.4cm 1.2cm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 0; font-size: 11px; line-height: 1.4; }

  .timbrado { display: flex; align-items: center; gap: 18px; padding-bottom: 12px; border-bottom: 3px solid #1F833D; margin-bottom: 16px; }
  .timbrado img { height: 75px; width: auto; }
  .timbrado .empresa { flex: 1; }
  .timbrado h1 { margin: 0 0 2px; color: #1F833D; font-size: 22px; letter-spacing: 0.5px; font-weight: 700; }
  .timbrado .razao { margin: 0 0 4px; font-size: 10px; color: #444; font-weight: 600; }
  .timbrado .empresa p { margin: 1px 0; font-size: 10px; color: #555; }
  .timbrado .cnpj { font-weight: 600; }

  .titulo { text-align: center; margin: 16px 0 14px; }
  .titulo h2 { margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; }
  .titulo p { margin: 4px 0 0; font-size: 10px; color: #666; }

  .resumo { display: flex; gap: 8px; margin-bottom: 14px; }
  .resumo .box { flex: 1; border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; text-align: center; }
  .resumo .box .num { font-size: 20px; font-weight: 700; line-height: 1; }
  .resumo .box .label { font-size: 9px; text-transform: uppercase; color: #666; letter-spacing: 0.5px; margin-top: 4px; }
  .resumo .total .num { color: #1a1a1a; }
  .resumo .uso   .num { color: #d97706; }
  .resumo .disp  .num { color: #1F833D; }
  .resumo .manut .num { color: #b91c1c; }

  table { width: 100%; border-collapse: collapse; }
  thead { background: #1F833D; color: white; }
  thead tr { display: table-row; }
  th { padding: 7px 8px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.3px; }
  td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #e5e5e5; font-size: 10px; }
  tbody tr:nth-child(even) { background: #f8f8f8; }
  td.num { font-family: 'Courier New', monospace; font-weight: 600; }
  .checkbox { display: inline-block; width: 14px; height: 14px; border: 1.5px solid #1a1a1a; border-radius: 2px; vertical-align: middle; }

  .status { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
  .status-EMUSO       { background: #fef3c7; color: #92400e; }
  .status-DISPONIVEL  { background: #dcfce7; color: #166534; }
  .status-MANUTENCAO  { background: #fee2e2; color: #991b1b; }
  .status-OUTRO       { background: #e5e7eb; color: #374151; }

  .rodape { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #666; }
  .assinatura-box { margin-top: 60px; display: flex; justify-content: center; }
  .assinatura { text-align: center; border-top: 1px solid #333; padding-top: 5px; width: 280px; font-size: 10px; color: #555; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    thead { display: table-header-group; }
    .botoes-tela { display: none !important; }
  }
</style>
</head>
<body>

<div class="timbrado">
  <img src="${window.location.origin}/logo.svg" alt="Trans Ambiental">
  <div class="empresa">
    <h1>TRANS AMBIENTAL</h1>
    <p class="razao">TRANS AMBIENTAL</p>
    <p class="cnpj">CNPJ: 00.000.000/0000-00</p>
    <p>[ENDEREÇO COMPLETO]</p>
    <p>Luziânia / GO · Tel: [TELEFONE]</p>
    <p>contato@transambientalcontainer.com.br · www.transambientalcontainer.com.br</p>
  </div>
</div>

<div class="titulo">
  <h2>Relatório de Estoque de Containers</h2>
  <p>Emitido em ${dataAtual} · Posição completa do pátio</p>
</div>

<div class="resumo">
  <div class="box total"><div class="num">${total}</div><div class="label">Total</div></div>
  <div class="box uso"><div class="num">${emUso}</div><div class="label">Em Uso</div></div>
  <div class="box disp"><div class="num">${disponiveis}</div><div class="label">Disponíveis</div></div>
  <div class="box manut"><div class="num">${manutencao}</div><div class="label">Manutenção</div></div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:7%; text-align:center;">Confer.</th>
      <th style="width:9%">Nº Container</th>
      <th style="width:13%">Status</th>
      <th style="width:24%">Cliente Atual</th>
      <th style="width:14%">Cidade</th>
      <th style="width:12%">Data Entrega</th>
      <th style="width:12%">Prev. Retirada</th>
      <th style="width:9%">Pátio</th>
    </tr>
  </thead>
  <tbody>
    ${linhas}
  </tbody>
</table>

<div class="rodape">
  <div>Trans Ambiental · Relatório de Estoque</div>
  <div>Gerado em ${dataAtual}</div>
</div>

<div class="assinatura-box">
  <div class="assinatura">Responsável pelo relatório</div>
</div>

</body>
</html>`

    const janela = window.open('', '_blank', 'width=1024,height=768')
    if (!janela) return
    janela.document.write(html)
    janela.document.close()
    janela.focus()
    setTimeout(() => janela.print(), 400)
  }

  const clienteAtual: Record<string, string> = {}
  controles.forEach(c => { clienteAtual[c.id_container] = c.cliente })

  const total       = containers.length
  const disponiveis = containers.filter(c => c.status_operacional === 'DISPONIVEL').length
  const emUso       = containers.filter(c => c.status_operacional === 'EM USO').length
  const manutencao  = containers.filter(c => c.status_operacional === 'MANUTENCAO').length

  function handleSort(col: SortCol) {
    if (sortCol !== col) {
      setSortCol(col)
      setSortDir('asc')
    } else {
      setSortDir(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? 'none' : 'asc')
    }
  }

  const porFiltro = filtro === 'DISPONIVEL'
    ? containers.filter(c => c.status_operacional === 'DISPONIVEL')
    : filtro === 'EM USO'
    ? containers.filter(c => c.status_operacional === 'EM USO')
    : containers

  const filtrado = porFiltro.filter(c =>
    c.id_container.toLowerCase().includes(busca.toLowerCase()) ||
    c.numero_container.toLowerCase().includes(busca.toLowerCase()) ||
    (clienteAtual[c.id_container] ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  const ordenado = useMemo(() => {
    if (sortDir === 'none') return filtrado
    return [...filtrado].sort((a, b) => {
      let cmp = 0
      if (sortCol === 'numero') {
        cmp = Number(a.numero_container) - Number(b.numero_container)
      } else if (sortCol === 'id_container') {
        cmp = a.id_container.localeCompare(b.id_container)
      } else if (sortCol === 'status') {
        cmp = a.status_operacional.localeCompare(b.status_operacional)
      } else if (sortCol === 'capacidade') {
        cmp = a.capacidade.localeCompare(b.capacidade)
      } else if (sortCol === 'cliente') {
        const ca = clienteAtual[a.id_container] ?? ''
        const cb = clienteAtual[b.id_container] ?? ''
        cmp = ca.localeCompare(cb)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrado, sortCol, sortDir])

  function badgeConservacao(estado: string) {
    if (estado === 'BOM')     return <span className="badge badge-success">Bom</span>
    if (estado === 'REGULAR') return <span className="badge badge-warning">Regular</span>
    return <span className="badge badge-destructive">Ruim</span>
  }

  const thStyle: React.CSSProperties = {
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  }

  const thHover = (col: SortCol) => ({
    ...thStyle,
    color: sortCol === col && sortDir !== 'none' ? 'var(--primary)' : undefined,
  })

  const stats = [
    { label: 'Total',       value: total,       color: 'var(--primary)'     },
    { label: 'Disponíveis', value: disponiveis, color: 'var(--success)'     },
    { label: 'Em Uso',      value: emUso,       color: 'var(--warning)'     },
    { label: 'Manutenção',  value: manutencao,  color: 'var(--destructive)' },
  ]

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Estoque</h1>
        <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>Status atual de todos os containers</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', fontWeight: 600, marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {[
            { value: 'TODOS',      label: 'Todos'      },
            { value: 'DISPONIVEL', label: 'Disponível' },
            { value: 'EM USO',     label: 'Em Uso'     },
          ].map(f => (
            <button key={f.value} onClick={() => setFiltro(f.value)}
              className={filtro === f.value ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}>
              {f.label}
            </button>
          ))}
        </div>
        <input className="input-field" style={{ maxWidth: '260px' }} placeholder="Buscar container ou cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
        <button
          onClick={imprimirRelatorio}
          style={{
            marginLeft: 'auto',
            padding: '0.5rem 1rem',
            background: '#1F833D',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          🖨️ Imprimir Relatório
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--fg-muted)' }}>Carregando...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={thHover('id_container')} onClick={() => handleSort('id_container')}>
                  Container <SortIcon dir={sortCol === 'id_container' ? sortDir : 'none'} />
                </th>
                <th style={thHover('numero')} onClick={() => handleSort('numero')}>
                  Nº <SortIcon dir={sortCol === 'numero' ? sortDir : 'none'} />
                </th>
                <th style={thHover('capacidade')} onClick={() => handleSort('capacidade')}>
                  Capacidade <SortIcon dir={sortCol === 'capacidade' ? sortDir : 'none'} />
                </th>
                <th style={thHover('status')} onClick={() => handleSort('status')}>
                  Status <SortIcon dir={sortCol === 'status' ? sortDir : 'none'} />
                </th>
                <th style={thHover('cliente')} onClick={() => handleSort('cliente')}>
                  Cliente Atual <SortIcon dir={sortCol === 'cliente' ? sortDir : 'none'} />
                </th>
                <th>Local Pátio</th>
                <th>Conservação</th>
                <th>Última Movimentação</th>
              </tr>
            </thead>
            <tbody>
              {ordenado.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--fg-muted)' }}>Nenhum container</td></tr>
              ) : ordenado.map(c => (
                <tr key={c.id}>
                  <td><span className="badge badge-muted" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{c.id_container}</span></td>
                  <td style={{ color: 'var(--fg-muted)' }}>{c.numero_container}</td>
                  <td style={{ fontSize: '0.8rem' }}>{c.capacidade}</td>
                  <td><StatusBadge status={c.status_operacional} /></td>
                  <td style={{ fontSize: '0.8rem' }}>{clienteAtual[c.id_container] ?? '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{c.local_patio || '—'}</td>
                  <td>{badgeConservacao(c.estado_conservacao)}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                    {(() => {
                      const ultima = movimentacoes.find(
                        m => m.id_container?.toString() === c.numero_container?.toString()
                      )
                      console.log('Container:', c.numero_container, 'Ultima:', ultima)
                      const dataUltima = ultima?.data_entrega
                        ? new Date(ultima.data_entrega).toLocaleDateString('pt-BR')
                        : '—'
                      return dataUltima
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
