import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const { login, register, loading, error } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    let result
    if (mode === 'login') {
      result = await login(form.email, form.password)
    } else {
      result = await register(form.fullName, form.email, form.password)
    }
    if (result.ok) navigate('/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'linear-gradient(135deg, #E1F5EE 0%, #f9fafb 60%)',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'var(--green-500)',
            borderRadius: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            fontSize: '28px',
          }}>🌿</div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Mindfulness Olavarría
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Psicóloga Gabriela Ithurralde
          </p>
        </div>

        {/* Tabs login/registro */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px',
          marginBottom: '24px',
        }}>
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '9px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                background: mode === m ? 'white' : 'transparent',
                color: mode === m ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {m === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          ))}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Tu nombre"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
          />

          {error && (
            <p style={{ color: '#dc2626', fontSize: '13px', textAlign: 'center' }}>{error}</p>
          )}

          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '4px' }}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta gratis'}
          </button>
        </form>

        {mode === 'register' && (
          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '14px' }}>
            🎁 7 días de acceso premium incluidos
          </p>
        )}
      </div>
    </div>
  )
}
