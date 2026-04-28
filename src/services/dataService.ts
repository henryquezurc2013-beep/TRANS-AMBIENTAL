import { supabase } from '../lib/supabase'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type NivelUsuario = 'ADMIN' | 'OPERACAO' | 'MANUTENCAO' | 'MOTORISTA'

export interface Usuario {
  id: string
  usuario: string
  senha: string
  nivel: NivelUsuario
  ativo: string
  created_at: string
}

export interface Motorista {
  id: string
  nome: string
  ativo: boolean
  criado_em: string
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
  celular: string | null
  endereco: string
  bairro_cidade: string
  cep: string | null
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
    async getMotoristas(): Promise<Usuario[]> {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('nivel', 'MOTORISTA')
        .order('usuario', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    async setAtivo(id: string, ativo: 'SIM' | 'NAO'): Promise<void> {
      const { error } = await supabase.from('usuarios').update({ ativo }).eq('id', id)
      if (error) throw error
    },
  },

  motoristas: {
    async getAll(): Promise<Motorista[]> {
      const { data, error } = await supabase
        .from('motoristas')
        .select('*')
        .order('nome', { ascending: true })
      if (error) throw error
      // Coerção defensiva: aceita boolean, "true"/"false", "SIM"/"NAO" e null
      return (data ?? []).map(m => ({
        ...m,
        ativo: m.ativo === true || m.ativo === 'true' || m.ativo === 'SIM',
      }))
    },

    async add(payload: Omit<Motorista, 'id' | 'criado_em'>): Promise<void> {
      const existente = await supabase
        .from('motoristas')
        .select('id')
        .ilike('nome', payload.nome.trim())
        .maybeSingle()

      if (existente.data) {
        throw new Error(`Já existe um motorista com o nome "${payload.nome}"`)
      }

      const { error } = await supabase.from('motoristas').insert({
        nome: payload.nome.trim(),
        ativo: payload.ativo,
      })
      if (error) throw error
    },

    async update(id: string, payload: Partial<Motorista>): Promise<void> {
      const limpo: Partial<Motorista> = {}
      if (payload.nome !== undefined) limpo.nome = payload.nome.trim()
      if (payload.ativo !== undefined) limpo.ativo = payload.ativo

      const { error } = await supabase
        .from('motoristas')
        .update(limpo)
        .eq('id', id)
      if (error) throw error
    },

    async setAtivo(id: string, ativo: boolean): Promise<void> {
      const { error } = await supabase
        .from('motoristas')
        .update({ ativo })
        .eq('id', id)
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
      if (!error) return
      if (error.message?.includes('column') || error.code === '42703') {
        const { cep: _cep, celular: _cel, ...base } = payload
        const { error: e2 } = await supabase.from('clientes').insert(base)
        if (e2) throw e2
        return
      }
      throw error
    },
    async update(id: string, payload: Partial<Cliente>): Promise<void> {
      const { error } = await supabase.from('clientes').update(payload).eq('id', id)
      if (!error) return
      if (error.message?.includes('column') || error.code === '42703') {
        const { cep: _cep, celular: _cel, ...base } = payload
        const { error: e2 } = await supabase.from('clientes').update(base).eq('id', id)
        if (e2) throw e2
        return
      }
      throw error
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
      if (!error) return
      // Se a coluna não existir ainda, tenta sem os campos extras
      const isColErr = error.message?.includes('column') || error.code === '42703'
      if (isColErr) {
        const { container_fixo: _cf, origem_acao: _oa, ...base } = payload
        const { error: e2 } = await supabase.from('controle').insert(base)
        if (e2) throw e2
        return
      }
      throw error
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

// ─── Efetivar Troca de Container ─────────────────────────────────────────────
// Troca um container em uso por outro disponível, no mesmo cliente.
// Usada tanto pela tela de Troca Manual quanto pela aprovação de trocas do app.

export interface EfetivarTrocaParams {
  containerAntigo: string
  containerNovo: string
  dataTroca: string
  material?: string
  motivo?: string
  observacao?: string
  usuario: string
}

export async function efetivarTroca(p: EfetivarTrocaParams): Promise<{ cliente: string }> {
  if (!p.containerAntigo || !p.containerNovo) {
    throw new Error('Informe o container antigo e o novo')
  }
  if (p.containerAntigo === p.containerNovo) {
    throw new Error('Container antigo e novo devem ser diferentes')
  }

  const abertos = await db.controle.getEmAberto()
  const registroAntigo = abertos.find(r => r.id_container === p.containerAntigo)
  if (!registroAntigo) {
    throw new Error(`Container ${p.containerAntigo} não está em uso em nenhum cliente`)
  }

  const contNovo = await db.containers.getById(p.containerNovo)
  if (!contNovo) {
    throw new Error(`Container ${p.containerNovo} não encontrado no cadastro`)
  }
  if (contNovo.status_operacional !== 'DISPONIVEL') {
    throw new Error(`Container ${p.containerNovo} não está disponível (status: ${contNovo.status_operacional})`)
  }

  const clienteNome = registroAntigo.cliente
  const hojeISO = new Date().toISOString().slice(0, 10)

  await db.controle.update(registroAntigo.id, {
    data_retirada: p.dataTroca,
    origem_acao: 'TROCA - RETORNOU AO PATIO',
  })

  await db.controle.add({
    data_lancamento: hojeISO,
    id_container: p.containerNovo,
    tipo_container: contNovo.tipo_container,
    cliente: clienteNome,
    contato_cliente: registroAntigo.contato_cliente,
    telefone_cliente: registroAntigo.telefone_cliente,
    data_entrega: p.dataTroca,
    previsao_retirada: registroAntigo.previsao_retirada,
    data_retirada: null,
    material: p.material || registroAntigo.material,
    observacao: [p.motivo, p.observacao].filter(Boolean).join(' — '),
    origem_acao: 'TROCA - NOVO CONTAINER NO CLIENTE',
    container_fixo: registroAntigo.container_fixo ?? false,
  })

  await db.containers.updateByIdContainer(p.containerAntigo, {
    status_operacional: 'DISPONIVEL',
    liberado_para_entrega: 'SIM',
  })
  await db.containers.updateByIdContainer(p.containerNovo, {
    status_operacional: 'EM USO',
    liberado_para_entrega: 'NAO',
  })

  await registrarLog(
    p.usuario,
    'TROCA CONTAINER',
    `Container ${p.containerAntigo} trocado por ${p.containerNovo} no cliente ${clienteNome}`,
  )

  return { cliente: clienteNome }
}
