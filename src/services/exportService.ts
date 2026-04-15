import { db } from './dataService'

// Exporta todas as tabelas em JSON
export async function exportarDadosJSON() {
  const [usuarios, containers, clientes, controle, manutencao, logs] = await Promise.all([
    db.usuarios.getAll(),
    db.containers.getAll(),
    db.clientes.getAll(),
    db.controle.getAll(),
    db.manutencao.getAll(),
    db.logs.getAll(),
  ])

  const dados = { exportado_em: new Date().toISOString(), usuarios, containers, clientes, controle, manutencao, logs }
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
  baixarArquivo(blob, `backup_trans_ambiental_${hoje()}.json`)
}

// Exporta tabela específica em CSV
export async function exportarTabelaCSV(tabela: 'controle' | 'containers') {
  if (tabela === 'controle') {
    const dados = await db.controle.getAll()
    const cabecalho = ['id', 'data_lancamento', 'id_container', 'cliente', 'data_entrega', 'previsao_retirada', 'data_retirada', 'material', 'observacao', 'origem_acao']
    exportCSV(dados, cabecalho, `controle_${hoje()}.csv`)
  } else {
    const dados = await db.containers.getAll()
    const cabecalho = ['id_container', 'numero_container', 'tipo_container', 'capacidade', 'status_operacional', 'local_patio', 'estado_conservacao', 'pintura_status', 'material_preferencial', 'observacao']
    exportCSV(dados, cabecalho, `containers_${hoje()}.csv`)
  }
}

function exportCSV(dados: object[], cabecalho: string[], nomeArquivo: string) {
  const linhas = [cabecalho.join(';')]
  for (const item of dados) {
    const linha = cabecalho.map(col => {
      const val = (item as Record<string, unknown>)[col] ?? ''
      return `"${String(val).replace(/"/g, '""')}"`
    })
    linhas.push(linha.join(';'))
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' })
  baixarArquivo(blob, nomeArquivo)
}

function baixarArquivo(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

function hoje() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '')
}
