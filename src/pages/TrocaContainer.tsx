import { useEffect, useState, FormEvent } from 'react'
import { db, Container, Log, registrarLog } from '../services/dataService'
import Icon from '../components/Icon'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'

const hoje = () => new Date().toISOString().slice(0, 10)

const MATERIAIS = ['AÇO', 'FERRO LATA']

const MOTIVOS = ['Container cheio', 'Dano', 'Solicitação cliente', 'Manutenção preventiva', 'Outro']

export default function TrocaContainer() {
  const { sessao } = useAuth()
  const toast = useToast()
  const [containers, setContainers] = useState<Container[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(false)

  const [containerAntigo, setContainerAntigo] = useState('')
  const [containerNovo, setContainerNovo] = useState('')
  const [dataTroca, setDataTroca] = useState(hoje())
  const [material, setMaterial] = useState('')
  const [motivo, setMotivo] = useState('')
  const [obs, setObs] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [c, l] = await Promise.all([db.containers.getAll(), db.logs.getAll()])
    setContainers(c)
    setLogs(l.filter(lg => lg.acao === 'TROCA CONTAINER').slice(0, 10))
  }

  const emUso = containers.filter(c => c.status_operacional === 'EM USO')
  const disponiveis = containers.filter(c =>
    c.status_operacional === 'DISPONIVEL' &&
    c.liberado_para_entrega === 'SIM' &&
    c.status_cadastro === 'ATIVO'
  )

  const infoAntigo = containerAntigo ? containers.find(c => c.id_container === containerAntigo) : null
  const infoNovo   = containerNovo   ? containers.find(c => c.id_container === containerNovo)   : null

  async function handleTroca(e: FormEvent) {
    e.preventDefault()
    if (!containerAntigo || !containerNovo || !dataTroca) {
      toast('Preencha todos os campos obrigatórios', 'error')
      return
    }
    if (containerAntigo === containerNovo) {
      toast('Container antigo e novo devem ser diferentes', 'error')
      return
    }
    setLoading(true)
    try {
      const abertos = await db.controle.getEmAberto()
      const registroAntigo = abertos.find(r => r.id_container === containerAntigo)
      if (!registroAntigo) throw new Error('Registro de entrega do container antigo não encontrado')

      const clienteNome = registroAntigo.cliente
      const contNovo = containers.find(c => c.id_container === containerNovo)!

      await db.controle.update(registroAntigo.id, {
        data_retirada: dataTroca,
        origem_acao: 'TROCA - RETORNOU AO PATIO',
      })

      await db.controle.add({
        data_lancamento: hoje(),
        id_container: containerNovo,
        tipo_container: contNovo.tipo_container,
        cliente: clienteNome,
        contato_cliente: registroAntigo.contato_cliente,
        telefone_cliente: registroAntigo.telefone_cliente,
        data_entrega: dataTroca,
        previsao_retirada: registroAntigo.previsao_retirada,
        data_retirada: null,
        material: material || registroAntigo.material,
        observacao: [motivo, obs].filter(Boolean).join(' — '),
        origem_acao: 'TROCA - NOVO CONTAINER NO CLIENTE',
        container_fixo: registroAntigo.container_fixo ?? false,
      })

      await db.containers.updateByIdContainer(containerAntigo, { status_operacional: 'DISPONIVEL', liberado_para_entrega: 'SIM' })
      await db.containers.updateByIdContainer(containerNovo,   { status_operacional: 'EM USO',     liberado_para_entrega: 'NAO' })

      await registrarLog(sessao!.usuarioAtual, 'TROCA CONTAINER',
        `Container ${containerAntigo} trocado por ${containerNovo} no cliente ${clienteNome}`)

      toast(`Troca realizada! ${containerAntigo} → ${containerNovo} para ${clienteNome}`, 'success')
      setContainerAntigo('')
      setContainerNovo('')
      setDataTroca(hoje())
      setMaterial('')
      setMotivo('')
      setObs('')
      await carregar()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao realizar troca', 'error')
    }
    setLoading(false)
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Troca de Container</h1>
        <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>Substitua um container em uso por outro disponível</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Coluna esquerda — formulário */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Icon name="swap" size={18} color="var(--primary)" />
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Nova Troca</h2>
          </div>

          <form onSubmit={handleTroca} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

            {/* Data */}
            <div className="form-group" style={{ maxWidth: '180px' }}>
              <label className="form-label">Data da troca *</label>
              <input className="input-field" type="date" value={dataTroca} onChange={e => setDataTroca(e.target.value)} required />
            </div>

            {/* Bloco substituição */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Substituição *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'start' }}>
                {/* Retirar */}
                <div style={{ background: 'hsl(8 72% 56% / 0.06)', border: '1px solid hsl(8 72% 56% / 0.25)', borderRadius: '0.625rem', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--destructive-fg)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span>←</span> Retirar
                  </div>
                  <select className="select-field" value={containerAntigo} onChange={e => setContainerAntigo(e.target.value)} required
                    style={{ background: 'hsl(8 72% 56% / 0.04)', borderColor: 'hsl(8 72% 56% / 0.2)' }}>
                    <option value="">Selecionar...</option>
                    {emUso.map(c => <option key={c.id} value={c.id_container}>{c.id_container}</option>)}
                  </select>
                  {infoAntigo && (
                    <div style={{ marginTop: '0.375rem', fontSize: '0.7rem', color: 'var(--fg-3)' }}>{infoAntigo.capacidade}</div>
                  )}
                </div>

                {/* Ícone central */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '1.5rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-soft)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="swap" size={13} color="var(--primary-fg)" />
                  </div>
                </div>

                {/* Entregar */}
                <div style={{ background: 'hsl(142 55% 45% / 0.06)', border: '1px solid hsl(142 55% 45% / 0.25)', borderRadius: '0.625rem', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--success-fg)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    Entregar <span>→</span>
                  </div>
                  <select className="select-field" value={containerNovo} onChange={e => setContainerNovo(e.target.value)} required
                    style={{ background: 'hsl(142 55% 45% / 0.04)', borderColor: 'hsl(142 55% 45% / 0.2)' }}>
                    <option value="">Selecionar...</option>
                    {disponiveis.map(c => <option key={c.id} value={c.id_container}>{c.id_container} — {c.capacidade}</option>)}
                  </select>
                  {infoNovo && (
                    <div style={{ marginTop: '0.375rem', fontSize: '0.7rem', color: 'var(--fg-3)' }}>{infoNovo.capacidade}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Material */}
            <div className="form-group">
              <label className="form-label">Material (opcional — mantém o anterior se vazio)</label>
              <select className="select-field" value={material} onChange={e => setMaterial(e.target.value)}>
                <option value="">Manter anterior</option>
                {MATERIAIS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Motivo chips */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Motivo da troca</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {MOTIVOS.map(m => (
                  <button
                    key={m}
                    type="button"
                    className={`motivo-chip${motivo === m ? ' on' : ''}`}
                    onClick={() => setMotivo(motivo === m ? '' : m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Observação */}
            <div className="form-group">
              <label className="form-label">Observação</label>
              <input className="input-field" placeholder="Detalhes adicionais..." value={obs} onChange={e => setObs(e.target.value)} />
            </div>

            {/* Caixa de confirmação */}
            {containerAntigo && containerNovo && (
              <div style={{ background: 'hsl(22 68% 52% / 0.08)', border: '1px solid hsl(22 68% 52% / 0.25)', borderRadius: '0.625rem', padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--fg-2)', lineHeight: 1.5 }}>
                <div style={{ fontWeight: 600, color: 'var(--primary-fg)', marginBottom: '0.25rem' }}>Resumo da operação</div>
                Container <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--destructive-fg)' }}>{containerAntigo}</strong> retorna ao pátio.
                Container <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--success-fg)' }}>{containerNovo}</strong> vai para o cliente.
                {motivo && <span> Motivo: <em>{motivo}</em>.</span>}
              </div>
            )}

            {/* Botões */}
            <div style={{ display: 'flex', gap: '0.625rem', paddingTop: '0.25rem' }}>
              <button type="button" className="btn-ghost" onClick={() => { setContainerAntigo(''); setContainerNovo(''); setMotivo(''); setObs('') }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
                {loading ? 'Processando...' : <><Icon name="swap" size={15} /> Confirmar troca</>}
              </button>
            </div>
          </form>
        </div>

        {/* Coluna direita — histórico */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Icon name="scroll" size={16} color="var(--fg-muted)" />
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Histórico recente</h2>
          </div>

          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--fg-dim)', fontSize: '0.875rem' }}>
              Nenhuma troca registrada
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {logs.map(log => {
                const partes = log.detalhes.match(/Container ([\w-]+) trocado por ([\w-]+) no cliente (.+)/)
                const ctOld = partes?.[1] ?? '?'
                const ctNew = partes?.[2] ?? '?'
                const cli   = partes?.[3] ?? log.detalhes
                const data  = new Date(log.data_hora)
                const dataFmt = `${String(data.getDate()).padStart(2,'0')}/${String(data.getMonth()+1).padStart(2,'0')} ${String(data.getHours()).padStart(2,'0')}:${String(data.getMinutes()).padStart(2,'0')}`
                return (
                  <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.75rem', background: 'var(--card-2)', borderRadius: '0.625rem', border: '1px solid var(--border-faint)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: 'hsl(8 72% 56% / 0.15)', color: 'var(--destructive-fg)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>{ctOld}</span>
                      <Icon name="arrow_right" size={11} style={{ color: 'var(--fg-dim)' }} />
                      <span className="badge" style={{ background: 'hsl(142 55% 45% / 0.15)', color: 'var(--success-fg)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>{ctNew}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cli}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.7rem', color: 'var(--fg-dim)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{dataFmt}</span>
                      <span>·</span>
                      <span>{log.usuario}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      <style>{`
        @media (max-width: 860px) {
          .troca-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
