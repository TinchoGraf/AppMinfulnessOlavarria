import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { statsAPI, emotionalAPI } from '../api/api'

export default function ProfilePage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [emotionHistory, setEmotionHistory] = useState([])

  useEffect(() => {
    statsAPI.me().then((r) => setStats(r.data)).catch(() => {})
    emotionalAPI.history(7).then((r) => setEmotionHistory(r.data)).catch(() => {})
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  const emotionEmoji = {
    ansiosa: '😰', acelerada: '⚡', triste: '😔',
    saturada: '😵', cansada: '😴', en_calma: '😌', contenta: '😊',
  }

  return (
    <div>
      <div style={{ background: 'white', padding: '24px 16px 16px', borderBottom: '0.5px solid var(--border)', textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px',
          background: 'var(--green-50)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 10px',
          fontSize: '22px', fontWeight: '600', color: 'var(--green-700)',
        }}>
          {initials}
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>{user?.full_name}</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{user?.email}</p>
        <div style={{ marginTop: '8px' }}>
          {user?.is_premium
            ? <span className="pill pill-amber">✨ Premium activo</span>
            : <span className="pill" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Plan gratuito</span>
          }
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Stats */}
        {stats && (
          <div style={{ marginBottom: '20px' }}>
            <p className="section-label">Mi progreso</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { value: stats.total_sessions, label: 'sesiones', icon: '🎯' },
                { value: stats.total_minutes, label: 'minutos', icon: '⏱️' },
                { value: stats.programs_in_progress, label: 'programas', icon: '📚' },
              ].map(({ value, label, icon }) => (
                <div key={label} style={{
                  background: 'white',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 10px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '18px', marginBottom: '2px' }}>{icon}</p>
                  <p style={{ fontSize: '20px', fontWeight: '600', color: 'var(--green-500)' }}>{value}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Registro emocional */}
        {emotionHistory.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p className="section-label">Registro emocional reciente</p>
            <div style={{
              background: 'white',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}>
              {emotionHistory.slice(0, 5).map((log, i) => (
                <div key={log.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderBottom: i < 4 ? '0.5px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: '20px' }}>{emotionEmoji[log.state] || '💚'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                      {log.state.replace('_', ' ')}
                    </p>
                    {log.note && (
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{log.note}</p>
                    )}
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(log.logged_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suscripción */}
        {!user?.is_premium ? (
          <div style={{
            background: 'var(--green-50)',
            border: '0.5px solid var(--green-100)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--green-900)', marginBottom: '4px' }}>
              Accedé a todo el contenido
            </p>
            <p style={{ fontSize: '12px', color: 'var(--green-700)', marginBottom: '12px' }}>
              Programas completos, audios exclusivos y más
            </p>
            <button
              className="btn-primary"
              style={{ maxWidth: '200px', margin: '0 auto' }}
              onClick={() => navigate('/planes')}
            >
              Ver planes premium
            </button>
          </div>
        ) : (
          <div style={{
            background: 'var(--green-50)',
            border: '0.5px solid var(--green-100)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--green-900)', marginBottom: '4px' }}>
              ✨ Suscripción activa
            </p>
            <p style={{ fontSize: '12px', color: 'var(--green-700)', marginBottom: '12px' }}>
              Tenés acceso a todo el contenido
            </p>
            <button
              className="btn-outline"
              style={{ maxWidth: '200px', margin: '0 auto' }}
              onClick={() => navigate('/planes')}
            >
              Gestionar suscripción
            </button>
          </div>
        )}

        {/* Opciones */}
        <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {[
            { label: 'Acerca de Gabriela Ithurralde', icon: '👩‍⚕️', action: () => window.open('https://psicologaithurralde.com.ar') },
            { label: 'Instagram', icon: '📸', action: () => window.open('https://instagram.com/mindfulnessolavarria') },
          ].map(({ label, icon, action }, i) => (
            <button
              key={label}
              onClick={action}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px', width: '100%', background: 'none',
                border: 'none', borderBottom: i === 0 ? '0.5px solid var(--border)' : 'none',
                textAlign: 'left', fontSize: '14px', color: 'var(--text-primary)',
              }}
            >
              <span>{icon}</span> {label}
              <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>›</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          style={{
            marginTop: '16px',
            width: '100%',
            padding: '13px',
            background: 'none',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            color: '#dc2626',
            fontWeight: '500',
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
