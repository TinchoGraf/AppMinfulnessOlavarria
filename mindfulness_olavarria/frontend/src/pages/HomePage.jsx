import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { contentAPI, emotionalAPI, statsAPI } from '../api/api'

const EMOTIONS = [
  { key: 'ansiosa', label: 'ansiosa', icon: '😰' },
  { key: 'acelerada', label: 'acelerada', icon: '⚡' },
  { key: 'triste', label: 'triste', icon: '😔' },
  { key: 'saturada', label: 'saturada', icon: '😵' },
  { key: 'cansada', label: 'cansada', icon: '😴' },
  { key: 'en_calma', label: 'en calma', icon: '😌' },
]

export default function HomePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [featured, setFeatured] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedEmotion, setSelectedEmotion] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [loadingRec, setLoadingRec] = useState(false)

  useEffect(() => {
    contentAPI.featured().then((r) => setFeatured(r.data)).catch(() => {})
    statsAPI.me().then((r) => setStats(r.data)).catch(() => {})
  }, [])

  const handleEmotion = async (emotion) => {
    setSelectedEmotion(emotion.key)
    setLoadingRec(true)
    try {
      await emotionalAPI.log({ state: emotion.key })
      const rec = await emotionalAPI.recommend(emotion.key)
      setRecommendations(rec.data)
    } catch {}
    setLoadingRec(false)
  }

  const firstName = user?.full_name?.split(' ')[0] || 'hola'

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'white',
        padding: '20px 20px 16px',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Buenos días,</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '600' }}>{firstName} 🌿</h1>
          {user?.is_premium && <span className="pill pill-amber">✨ Premium</span>}
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
            {[
              { value: stats.total_sessions, label: 'sesiones' },
              { value: stats.total_minutes, label: 'minutos' },
              { value: stats.current_streak_days, label: 'días seguidos' },
            ].map(({ value, label }) => (
              <div key={label} style={{
                background: 'white',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                textAlign: 'center',
                border: '0.5px solid var(--border)',
              }}>
                <p style={{ fontSize: '22px', fontWeight: '600', color: 'var(--green-500)' }}>{value}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ¿Cómo te sentís? */}
        <div style={{
          background: 'var(--green-50)',
          border: '0.5px solid var(--green-100)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <p style={{ fontSize: '15px', fontWeight: '500', color: 'var(--green-900)', marginBottom: '12px' }}>
            ¿Cómo te sentís hoy?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {EMOTIONS.map((emotion) => (
              <button
                key={emotion.key}
                onClick={() => handleEmotion(emotion)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 6px',
                  borderRadius: 'var(--radius-sm)',
                  border: selectedEmotion === emotion.key
                    ? '1.5px solid var(--green-500)'
                    : '0.5px solid var(--border)',
                  background: selectedEmotion === emotion.key ? 'white' : 'var(--bg-secondary)',
                  fontSize: '12px',
                  color: selectedEmotion === emotion.key ? 'var(--green-700)' : 'var(--text-secondary)',
                  fontWeight: selectedEmotion === emotion.key ? '500' : '400',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '20px' }}>{emotion.icon}</span>
                {emotion.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recomendaciones según emoción */}
        {selectedEmotion && (
          <div style={{ marginBottom: '20px' }}>
            <p className="section-label">Recomendado para vos</p>
            {loadingRec ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Buscando...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recommendations.slice(0, 3).map((item) => (
                  <ContentCard key={item.id} item={item} onClick={() => navigate(`/contenido/${item.id}`)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pausas rápidas */}
        <div style={{ marginBottom: '20px' }}>
          <p className="section-label">Pausas rápidas</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['1 min', '3 min', '5 min'].map((t) => (
              <button
                key={t}
                onClick={() => navigate('/contenido')}
                style={{
                  flex: 1,
                  padding: '14px 8px',
                  background: 'white',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '20px' }}>⏱️</span>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido destacado */}
        {featured.length > 0 && (
          <div>
            <p className="section-label">Destacado</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {featured.slice(0, 4).map((item) => (
                <ContentCard key={item.id} item={item} onClick={() => navigate(`/contenido/${item.id}`)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ContentCard({ item, onClick }) {
  const typeIcon = {
    audio: '🎵', exercise: '✍️', breathing: '💨', video: '🎥', text: '📝',
  }

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: 'white',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        width: '100%',
        textAlign: 'left',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{
        width: '44px', height: '44px',
        background: item.is_premium ? 'var(--amber-50)' : 'var(--green-50)',
        borderRadius: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '20px', flexShrink: 0,
      }}>
        {typeIcon[item.content_type] || '🎵'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {item.duration_seconds ? `${Math.round(item.duration_seconds / 60)} min` : ''} · {item.category?.name || ''}
        </p>
      </div>
      {item.is_premium
        ? <span className="pill pill-amber">🔒</span>
        : <span className="pill pill-green">Gratis</span>
      }
    </button>
  )
}
