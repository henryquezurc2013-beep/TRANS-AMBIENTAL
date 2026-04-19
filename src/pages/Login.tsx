import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'

export default function Login() {
  const { login }    = useAuth()
  const toast        = useToast()
  const navigate     = useNavigate()
  const [usuario,     setUsuario]     = useState('')
  const [senha,       setSenha]       = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [erro,        setErro]        = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!usuario.trim() || !senha.trim()) { setErro('Preencha usuário e senha'); return }
    setLoading(true)
    setErro('')
    const resultado = await login(usuario.trim(), senha)
    setLoading(false)
    if (resultado) { setErro(resultado); toast(resultado, 'error') }
    else { toast('Login realizado com sucesso!', 'success'); navigate('/dashboard') }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% -10%, hsl(217 91% 60% / 0.15), transparent)',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        {/* Topo — logo + nome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '40px', height: '40px', flexShrink: 0,
            background: '#fff', borderRadius: '9px', padding: '5px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}>
            <img src="/logo.svg" alt="Trans Ambiental" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--fg)', lineHeight: 1.2 }}>Trans Ambiental</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--fg-mute)' }}>Controle de Containers</div>
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '0.9375rem', fontWeight: 600 }}>Fazer login</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Usuário</label>
              <input
                className="input-field"
                type="text"
                placeholder="Digite seu usuário"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 0, display: 'flex' }}
                >
                  {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {erro && (
              <div style={{
                background: 'hsl(0 84% 60% / 0.1)',
                border: '1px solid hsl(0 84% 60% / 0.3)',
                borderRadius: '0.5rem',
                padding: '0.625rem 0.875rem',
                fontSize: '0.8125rem',
                color: 'var(--destructive)',
              }}>
                {erro}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '0.625rem', marginTop: '0.25rem', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Entrando...' : <><LogIn size={15} /> Entrar</>}
            </button>
          </form>
        </div>

        {/* Rodapé */}
        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '11px', color: 'var(--fg-dim)' }}>
          TRANS AMBIENTAL · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
