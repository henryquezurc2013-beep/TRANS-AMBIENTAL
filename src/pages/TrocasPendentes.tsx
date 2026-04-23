import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import { supabase } from '../lib/supabase'
import { registrarLog } from '../services/dataService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'

interface TrocaPendente {
  id: string
  motorista_id: string
  motorista_nome: string
  cliente: string
  container_retirado: string
  container_entregue: string
  observacao: string | null
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO'
  motivo_rejeicao: string | null
  aprovado_por: string | null
  aprovado_em: string | null
  criado_em: string
}

type Filtro = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'TODAS'

function fmt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function TrocasPendentes() {
  const { sessao } = useAuth()
  const toast = useToast()
  const [trocas, setTrocas] = useState<TrocaPendente[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('PENDENTE')
  const [modalRejeicao, setModalRejeicao] = useState<TrocaPendente | null>(null)
  const [motivo, setMotivo] = useState('')
  const [processando, setProcessando] = useState<string | null>(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('trocas_pendentes')
      .select('*')
      .order('criado_em', { ascending: false })
    console.log('Trocas pendentes:', data, error)
    if (data) setTrocas(data as TrocaPendente[])
    setLoading(false)
  }

  const pendentes = trocas.filter(t => t.status === 'PENDENTE').length

  const trocasFiltradas = filtro === 'TODAS'
    ? trocas
    : trocas.filter(t => t.status === filtro)

  async function aprovar(t: TrocaPendente) {
    setProcessando(t.id)
    try {
      const { error } = await supabase
        .from('trocas_pendentes')
        .update({
          status: 'APROVADO',
          aprovado_por: sessao?.usuarioAtual ?? 'admin',
          aprovado_em: new Date().toISOString(),
        })
        .eq('id', t.id)

      if (error) throw error

      await registrarLog(
        sessao?.usuarioAtual ?? 'admin',
        'TROCA APROVADA',
        `Motorista: ${t.motorista_nome} · Cliente: ${t.cliente} · Retirada: ${t.container_retirado} · Entregue: ${t.container_entregue}`,
      )

      toast(`Troca de ${t.motorista_nome} aprovada`, 'success')
      await carregar()
    } catch {
      toast('Erro ao aprovar troca', 'error')
    } finally {
      setProcessando(null)
    }
  }

  async function confirmarRejeicao() {
    if (!modalRejeicao) return
    if (!motivo.trim()) { toast('Informe o motivo da rejeição', 'error'); return }
    setProcessando(modalRejeicao.id)
    try {
      const { error } = await supabase
        .from('trocas_pendentes')
        .update({
          status: 'REJEITADO',
          motivo_rejeicao: motivo.trim(),
          aprovado_por: sessao?.usuarioAtual ?? 'admin',
          aprovado_em: new Date().toISOString(),
        })
        .eq('id', modalRejeicao.id)

      if (error) throw error
      toast('Troca rejeitada', 'info')
      setModalRejeicao(null)
      setMotivo('')
      await carregar()
    } catch {
      toast('Erro ao rejeitar troca', 'error')
    } finally {
      setProcessando(null)
    }
  }

  const FILTROS: { label: string; valor: Filtro }[] = [
    { label: 'Pendentes', valor: 'PENDENTE' },
    { label: 'Aprovadas', valor: 'APROVADO' },
    { label: 'Rejeitadas', valor: 'REJEITADO' },
    { label: 'Todas',      valor: 'TODAS' },
  ]

  const STATUS_STYLE: Record<string, { color: string; background: string }> = {
    PENDENTE:  { color: 'hsl(38 80% 60%)',  background: 'hsl(38 80% 18%)' },
    APROVADO:  { color: 'hsl(140 60% 55%)', background: 'hsl(140 40% 12%)' },
    REJEITADO: { color: 'hsl(0 70% 58%)',   background: 'hsl(0 50% 12%)' },
  }

  return (
    <AppLayout>
      <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Título */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
            APP MOTORISTAS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--fg)', margin: 0 }}>
              Trocas Pendentes
            </h1>
            {pendentes > 0 && (
              <span style={{ background: 'hsl(0 70% 45%)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '9999px' }}>
                {pendentes}
              </span>
            )}
          </div>
          {pendentes > 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--fg-dim)', marginTop: '0.25rem' }}>
              {pendentes} troca{pendentes > 1 ? 's' : ''} aguardando aprovação
            </p>
          )}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {FILTROS.map(f => (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              style={{
                padding: '0.4rem 0.875rem',
                borderRadius: '9999px',
                border: '1px solid',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                borderColor: filtro === f.valor ? 'var(--primary)' : 'var(--border-soft)',
                background: filtro === f.valor ? 'var(--primary)' : 'transparent',
                color: filtro === f.valor ? 'hsl(38 40% 10%)' : 'var(--fg-3)',
              }}
            >
              {f.label}
              {f.valor === 'PENDENTE' && pendentes > 0 && (
                <span style={{ marginLeft: '0.375rem', background: 'hsl(0 70% 45%)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '9999px' }}>
                  {pendentes}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={carregar}
            style={{ marginLeft: 'auto', padding: '0.4rem 0.875rem', borderRadius: '9999px', border: '1px solid var(--border-soft)', fontSize: '0.8125rem', cursor: 'pointer', background: 'transparent', color: 'var(--fg-dim)' }}
          >
            ↻ Atualizar
          </button>
        </div>

        {/* Tabela */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--fg-dim)' }}>Carregando...</div>
        ) : trocasFiltradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--fg-dim)', fontSize: '0.9rem' }}>
            Nenhuma troca {filtro !== 'TODAS' ? filtro.toLowerCase() : ''} encontrada.
          </div>
        ) : (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border-soft)', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'hsl(145 14% 10%)' }}>
                  {['Motorista', 'Cliente', 'Retirada', 'Entregue', 'Data', 'Observação', 'Status', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--fg-dim)', textAlign: 'left', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-soft)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trocasFiltradas.map((t, i) => {
                  const st = STATUS_STYLE[t.status]
                  return (
                    <tr key={t.id} style={{ borderBottom: i < trocasFiltradas.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: i % 2 === 1 ? 'hsl(145 14% 9%)' : 'transparent' }}>
                      <td style={td}>{t.motorista_nome}</td>
                      <td style={{ ...td, fontWeight: 600, color: 'var(--fg)' }}>{t.cliente}</td>
                      <td style={{ ...td, fontFamily: 'var(--font-mono)', color: 'hsl(38 80% 60%)' }}>{t.container_retirado}</td>
                      <td style={{ ...td, fontFamily: 'var(--font-mono)', color: 'hsl(140 60% 55%)' }}>{t.container_entregue}</td>
                      <td style={{ ...td, fontSize: '0.75rem', color: 'var(--fg-dim)', whiteSpace: 'nowrap' }}>{fmt(t.criado_em)}</td>
                      <td style={{ ...td, fontSize: '0.8rem', color: 'var(--fg-dim)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.observacao || '—'}
                        {t.status === 'REJEITADO' && t.motivo_rejeicao && (
                          <div style={{ color: 'hsl(0 60% 55%)', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                            ✕ {t.motivo_rejeicao}
                          </div>
                        )}
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '9999px', color: st?.color, background: st?.background }}>
                          {t.status}
                        </span>
                      </td>
                      <td style={td}>
                        {t.status === 'PENDENTE' && (
                          <div style={{ display: 'flex', gap: '0.375rem' }}>
                            <button
                              onClick={() => aprovar(t)}
                              disabled={processando === t.id}
                              style={{ ...btnAprovar, opacity: processando === t.id ? 0.6 : 1 }}
                            >
                              ✅ Aprovar
                            </button>
                            <button
                              onClick={() => { setModalRejeicao(t); setMotivo('') }}
                              disabled={processando === t.id}
                              style={{ ...btnRejeitar, opacity: processando === t.id ? 0.6 : 1 }}
                            >
                              ❌ Rejeitar
                            </button>
                          </div>
                        )}
                        {t.status !== 'PENDENTE' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--fg-dim)' }}>
                            {t.aprovado_por && `Por ${t.aprovado_por}`}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal rejeição */}
      {modalRejeicao && (
        <>
          <div
            onClick={() => setModalRejeicao(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 499, backdropFilter: 'blur(4px)' }}
          />
          <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: 'hsl(145 14% 10%)', border: '1px solid var(--border-soft)', borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: '400px' }}>
              <h3 style={{ margin: '0 0 0.25rem', color: 'var(--fg)', fontSize: '1rem', fontWeight: 700 }}>
                Rejeitar troca
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--fg-dim)', margin: '0 0 1rem' }}>
                {modalRejeicao.motorista_nome} · {modalRejeicao.cliente}
              </p>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Motivo da rejeição
              </label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Descreva o motivo..."
                rows={3}
                style={{ width: '100%', marginTop: '0.375rem', padding: '0.75rem', background: 'hsl(145 14% 14%)', border: '1px solid var(--border-soft)', borderRadius: '0.625rem', color: 'var(--fg)', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={() => setModalRejeicao(null)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--border-soft)', borderRadius: '0.625rem', color: 'var(--fg-dim)', cursor: 'pointer', fontSize: '0.875rem' }}>
                  Cancelar
                </button>
                <button
                  onClick={confirmarRejeicao}
                  disabled={processando === modalRejeicao.id}
                  style={{ flex: 1, padding: '0.75rem', background: 'hsl(0 60% 40%)', border: 'none', borderRadius: '0.625rem', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  )
}

const td: React.CSSProperties = {
  padding: '0.875rem 1rem',
  fontSize: '0.8125rem',
  color: 'var(--fg-3)',
  verticalAlign: 'top',
}

const btnAprovar: React.CSSProperties = {
  padding: '0.35rem 0.625rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  background: 'hsl(140 40% 14%)',
  color: 'hsl(140 60% 55%)',
  border: '1px solid hsl(140 40% 22%)',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const btnRejeitar: React.CSSProperties = {
  padding: '0.35rem 0.625rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  background: 'hsl(0 50% 14%)',
  color: 'hsl(0 70% 60%)',
  border: '1px solid hsl(0 50% 22%)',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
