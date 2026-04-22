import { supabase } from '../lib/supabase'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type NivelUsuario = 'ADMIN' | 'OPERACAO' | 'MANUTENCAO'

export interface Usuario {
  id: string
  usuario: string
  senha: string
  nivel: NivelUsuario
  ativo: string
  created_at: string
}

export interface Container {
  id: string
  id_container: string
  numero_container: string
  tipo_container: string
  capacidade: string
  status_cadastro: string
  local_patio: string
  status_operacional: string
  liberado_para_entrega: string
  material_preferencial: string
  observacao: string
  estado_conservacao: string
  data_cadastro: string
  pintura_status: string
  created_at: string
}

export interface Cliente {
  id: string
  nome_cliente: string
  contato: string
  telefone: string
  endereco: string
  bairro_cidade: string
  observacao: string
  created_at: string
}

export interface Controle {
  id: string
  data_lancamento: string
  id_container: string
  tipo_container: string
  cliente: string
  contato_cliente: string
  telefone_cliente: string
  data_entrega: string
  previsao_retirada: string | null
  data_retirada: string | null
  material: string
  observacao: string
  origem_acao: string
  container_fixo: boolean
  created_at: string
}

export interface Manutencao {
  id: string
  data_lancamento: string
  id_container: string
  tipo_container: string
  descricao: string
  status_manutencao: string
  prioridade: string
  responsavel: string
  custo: number
  observacao: string
  created_at: string
}

export interface Log {
  id: string
  data_hora: string
  usuario: string
  acao: string
  detalhes: string
}

// ─── Registrar Log ────────────────────────────────────────────────────────────

export async function registrarLog(usuario: string, acao: string, detalhes: string) {
  await supabase.from('logs').insert({ usuario, acao, detalhes })
}

// ─── DB ───────────────────────────────────────────────────────────────────────

export const db = {
  usuarios: {
    async getAll(): Promise<Usuario[]> {
      const { data, error } = await supabase.from('usuarios').select('*').order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    async getByUsuario(usuario: string): Promise<Usuario | null> {
      const { data } = await supabase.from('usuarios').select('*').eq('usuario', usuario).single()
      return data ?? null
    },
    async add(payload: Omit<Usuario, 'id' | 'created_at'>): Promise<void> {
      const { error } = await supabase.from('usuarios').insert(payload)
      if (error) throw error
    },
    async update(id: string, payload: Partial<Usuario>): Promise<void> {
      const { error } = await supabase.from('usuarios').update(payload).eq('id', id)
      if (error) throw error
    },
  },

  containers: {
    async getAll(): Promise<Container[]> {
      const { data, error } = await supabase.from('cadastro_containers').select('*').order('numero_container', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    async getById(id_container: string): Promise<Container | null> {
      const { data } = await supabase.from('cadastro_containers').select('*').eq('id_container', id_container).single()
      return data ?? null
    },
    async add(payload: Omit<Container, 'id' | 'created_at'>): Promise<void> {
      const existing = await supabase.from('cadastro_containers').select('id').eq('id_container', payload.id_container).single()
      if (existing.data) throw new Error(`Container ${payload.id_container} já cadastrado`)
      const { error } = await supabase.from('cadastro_containers').insert(payload)
      if (error) throw error
    },
    async update(id: string, payload: Partial<Container>): Promise<void> {
      const { error } = await supabase.from('cadastro_containers').update(payload).eq('id', id)
      if (error) throw error
    },
    async updateByIdContainer(id_container: string, payload: Partial<Container>): Promise<void> {
      const { error } = await supabase.from('cadastro_containers').update(payload).eq('id_container', id_container)
      if (error) throw error
    },
  },

  clientes: {
    async getAll(): Promise<Cliente[]> {
      const { data, error } = await supabase.from('clientes').select('*').order('nome_cliente', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    async add(payload: Omit<Cliente, 'id' | 'created_at'>): Promise<void> {
      const existing = await supabase.from('clientes').select('id').ilike('nome_cliente', payload.nome_cliente).single()
      if (existing.data) throw new Error(`Cliente "${payload.nome_cliente}" já cadastrado`)
      const { error } = await supabase.from('clientes').insert(payload)
      if (error) throw error
    },
    async update(id: string, payload: Partial<Cliente>): Promise<void> {
      const { error } = await supabase.from('clientes').update(payload).eq('id', id)
      if (error) throw error
    },
    async delete(id: string): Promise<void> {
      const { error } = await supabase.from('clientes').delete().eq('id', id)
      if (error) throw error
    },
    async temMovimentacoes(nome_cliente: string): Promise<boolean> {
      const { count } = await supabase
        .from('controle')
        .select('id', { count: 'exact', head: true })
        .eq('cliente', nome_cliente)
      return (count ?? 0) > 0
    },
  },

  controle: {
    async getAll(): Promise<Controle[]> {
      const { data, error } = await supabase.from('controle').select('*').order('data_lancamento', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    async getEmAberto(): Promise<Controle[]> {
      const { data, error } = await supabase.from('controle').select('*').is('data_retirada', null)
      if (error) throw error
      return data ?? []
    },
    async add(payload: Omit<Controle, 'id' | 'created_at'>): Promise<void> {
      const { error } = await supabase.from('controle').insert(payload)
      if (error) throw error
    },
    async update(id: string, payload: Partial<Controle>): Promise<void> {
      const { error } = await supabase.from('controle').update(payload).eq('id', id)
      if (error) throw error
    },
  },

  manutencao: {
    async getAll(): Promise<Manutencao[]> {
      const { data, error } = await supabase.from('manutencao').select('*').order('data_lancamento', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    async add(payload: Omit<Manutencao, 'id' | 'created_at'>): Promise<void> {
      const { error } = await supabase.from('manutencao').insert(payload)
      if (error) throw error
    },
    async update(id: string, payload: Partial<Manutencao>): Promise<void> {
      const { error } = await supabase.from('manutencao').update(payload).eq('id', id)
      if (error) throw error
    },
  },

  logs: {
    async getAll(): Promise<Log[]> {
      const { data, error } = await supabase.from('logs').select('*').order('data_hora', { ascending: false }).limit(500)
      if (error) throw error
      return data ?? []
    },
  },
}
