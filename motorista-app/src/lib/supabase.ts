import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://fdacmjicteowdwysrbcm.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ZUC-Mb3ed68lx37sKTG0kw_ifYJkzoi'

export const supabase = createClient(url, key)

export interface Motorista {
  id: string
  nome: string
  celular: string | null
  ativo: boolean
  created_at: string
}

export interface TrocaPendente {
  id: string
  motorista_id: string
  motorista_nome: string
  cliente: string
  cacamba_retirada: string
  cacamba_entregue: string
  observacao: string | null
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO'
  motivo_rejeicao: string | null
  aprovado_por: string | null
  aprovado_em: string | null
  created_at: string
}

export interface Sessao {
  motorista_id: string
  motorista_nome: string
}

export function getSessao(): Sessao | null {
  try {
    const raw = localStorage.getItem('ta_motorista')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSessao(s: Sessao) {
  localStorage.setItem('ta_motorista', JSON.stringify(s))
}

export function clearSessao() {
  localStorage.removeItem('ta_motorista')
}
