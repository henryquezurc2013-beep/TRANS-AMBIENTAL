import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { db, NivelUsuario, registrarLog } from '../services/dataService'

// ─── Permissões por nível ─────────────────────────────────────────────────────

const PERMISSOES: Record<NivelUsuario, string[]> = {
  ADMIN: ['*'],
  OPERACAO: ['Dashboard', 'Cadastro_Rapido', 'Controle', 'Estoque', 'Atrasados', 'Cadastro_Containers', 'Cadastro_Container', 'Clientes', 'Cadastro_Cliente', 'Troca_Container'],
  MANUTENCAO: ['Dashboard', 'Manutencao', 'Lancamento_Manutencao', 'Estoque', 'Cadastro_Containers', 'Cadastro_Container', 'Logs'],
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Sessao {
  logado: boolean
  usuarioAtual: string
  nivelAtual: NivelUsuario
  usuarioId: string
}

interface AuthContextType {
  sessao: Sessao | null
  login: (usuario: string, senha: string) => Promise<string | null>
  logout: () => Promise<void>
  temAcesso: (pagina: string) => boolean
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null)

const SESSAO_KEY = 'trans_ambiental_sessao'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(() => {
    try {
      const raw = localStorage.getItem(SESSAO_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (sessao?.logado) {
      localStorage.setItem(SESSAO_KEY, JSON.stringify(sessao))
    } else {
      localStorage.removeItem(SESSAO_KEY)
    }
  }, [sessao])

  async function login(usuario: string, senha: string): Promise<string | null> {
    const user = await db.usuarios.getByUsuario(usuario)
    if (!user) return 'Usuário não encontrado'
    if (user.ativo === 'NAO') return 'Usuário inativo. Contate o administrador.'
    if (user.senha !== senha) return 'Senha incorreta'

    const novaSessao: Sessao = {
      logado: true,
      usuarioAtual: user.usuario,
      nivelAtual: user.nivel,
      usuarioId: user.id,
    }
    setSessao(novaSessao)
    await registrarLog(user.usuario, 'LOGIN', `Login realizado - Nível: ${user.nivel}`)
    return null
  }

  async function logout(): Promise<void> {
    if (sessao?.usuarioAtual) {
      await registrarLog(sessao.usuarioAtual, 'LOGOUT', 'Sessão encerrada pelo usuário')
    }
    setSessao(null)
  }

  function temAcesso(pagina: string): boolean {
    if (!sessao?.logado) return false
    const perms = PERMISSOES[sessao.nivelAtual]
    return perms.includes('*') || perms.includes(pagina)
  }

  return (
    <AuthContext.Provider value={{ sessao, login, logout, temAcesso }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
