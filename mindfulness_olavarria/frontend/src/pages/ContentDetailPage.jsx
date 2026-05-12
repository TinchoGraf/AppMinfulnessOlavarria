import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { contentAPI } from '../api/api'
import useAuthStore from '../store/authStore'

export default function ContentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    contentAPI.detail(id)
      .then((r) => setItem(r.data))
      .catch(() => setError('No se pudo cargar el contenido'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingScreen />
  if (error || !item) return <ErrorScreen onBack={() => navigate(-1)} />

  const canAccess = !item.is_premium || user?.is_premium
  const typeIcon = { audio: '🎵', exercise: '✍️', breathing: '💨', video: '🎥', text: '📝' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>

      {/* Header */}
      <div style={{
        background: 'white',
        padding: '16px',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
        >
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {item.category?.name || 'Contenido'}
          </p>
        </div>
        {item.is_premium && <span className="pill pill-amber">✨ Premium</span>}
      </div>

      <div style={{ padding: '24px 20px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Portada */}
        <div style={{
          width: '100%',
          aspectRatio: '1',
          maxWidth: '280px',
          margin: '0 auto 24px',
          background: item.is_premium
            ? 'linear-gradient(135deg, #FAEEDA, #F6C87A)'
            : 'linear-gradient(135deg, #E1F5EE, #5DCAA5)',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '72px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        }}>
          {typeIcon[item.content_type] || '🎵'}
        </div>

        {/* Info */}
        <h1 style={{ fontSize: '22px', fontWeight: '600', textAlign: 'center', marginBottom: '8px', lineHeight: '1.3' }}>
          {item.title}
        </h1>
        {item.description && (
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.6', marginBottom: '24px' }}>
            {item.description}
          </p>
        )}

        {/* Contenido según tipo y acceso */}
        {!canAccess ? (
          <Paywall />
        ) : item.content_type === 'audio' ? (
          <AudioPlayer item={item} />
        ) : (item.content_type === 'exercise' || item.content_type === 'breathing' || item.content_type === 'text') ? (
          <TextContent item={item} />
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Contenido no disponible</p>
        )}

        {/* Favorito */}
        <FavoriteButton itemId={item.id} initialFav={item.is_favorite} />
      </div>
    </div>
  )
}


// ─── Reproductor de Audio ─────────────────────────────────────────────────────

function AudioPlayer({ item }) {
  const audioRef = useRef(null)
  const progressRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(item.duration_seconds || 0)
  const [saved, setSaved] = useState(false)
  const saveTimerRef = useRef(null)

  const audioUrl = item.audio_file
    ? `http://localhost:8000/api/v1/media/audio/${item.audio_file}`
    : item.audio_url
    ? `http://localhost:8000/api/v1/media/audio/${item.audio_url.split('/').pop()}`
    : null

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    const ct = audioRef.current.currentTime
    setCurrentTime(ct)

    // Guardar progreso cada 10 segundos
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const completed = ct >= duration * 0.9
      contentAPI.saveProgress(item.id, {
        progress_seconds: Math.floor(ct),
        completed,
      })
      if (completed) setSaved(true)
    }, 10000)
  }

  const handleEnded = () => {
    setPlaying(false)
    contentAPI.saveProgress(item.id, { progress_seconds: Math.floor(duration), completed: true })
    setSaved(true)
  }

  const handleSeek = (e) => {
    if (!audioRef.current || !progressRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(1, x / rect.width))
    audioRef.current.currentTime = pct * duration
    setCurrentTime(pct * duration)
  }

  const fmt = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '0.5px solid var(--border)' }}>
      {!audioUrl ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>🎵</p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            El audio de este contenido aún no fue subido.
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            El administrador puede subirlo desde el panel admin.
          </p>
        </div>
      ) : (
        <>
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(e) => setDuration(e.target.duration)}
            onEnded={handleEnded}
            preload="metadata"
          />

          {/* Barra de progreso */}
          <div
            ref={progressRef}
            onClick={handleSeek}
            style={{
              height: '4px',
              background: 'var(--bg-tertiary)',
              borderRadius: '2px',
              cursor: 'pointer',
              marginBottom: '8px',
              position: 'relative',
            }}
          >
            <div style={{
              height: '4px',
              width: `${progress}%`,
              background: 'var(--green-500)',
              borderRadius: '2px',
              transition: 'width 0.5s linear',
            }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: `${progress}%`,
              transform: 'translate(-50%, -50%)',
              width: '14px',
              height: '14px',
              background: 'var(--green-500)',
              borderRadius: '50%',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }} />
          </div>

          {/* Tiempo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>

          {/* Controles */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
            <button
              onClick={() => { if (audioRef.current) { audioRef.current.currentTime = Math.max(0, currentTime - 15); setCurrentTime(audioRef.current.currentTime) } }}
              style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >⏪</button>

            <button
              onClick={togglePlay}
              style={{
                width: '64px', height: '64px',
                borderRadius: '50%',
                background: 'var(--green-500)',
                border: 'none',
                fontSize: '28px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(29,158,117,0.35)',
                color: 'white',
              }}
            >
              {playing ? '⏸' : '▶'}
            </button>

            <button
              onClick={() => { if (audioRef.current) { audioRef.current.currentTime = Math.min(duration, currentTime + 15); setCurrentTime(audioRef.current.currentTime) } }}
              style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >⏩</button>
          </div>

          {saved && (
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--green-700)', marginTop: '16px' }}>
              ✅ Sesión completada
            </p>
          )}
        </>
      )}
    </div>
  )
}


// ─── Contenido de texto / ejercicio ──────────────────────────────────────────

function TextContent({ item }) {
  const [completed, setCompleted] = useState(item.is_completed)

  const handleComplete = () => {
    contentAPI.saveProgress(item.id, { progress_seconds: item.duration_seconds || 0, completed: true })
    setCompleted(true)
  }

  return (
    <div>
      {item.body_text ? (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '0.5px solid var(--border)',
          marginBottom: '16px',
        }}>
          <p style={{ fontSize: '15px', lineHeight: '1.8', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
            {item.body_text}
          </p>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>📝</p>
          <p>El contenido de este ejercicio aún no fue cargado.</p>
        </div>
      )}

      {!completed ? (
        <button className="btn-primary" onClick={handleComplete}>
          ✅ Marcar como completado
        </button>
      ) : (
        <div style={{ textAlign: 'center', padding: '12px', background: 'var(--green-50)', borderRadius: '10px', color: 'var(--green-700)', fontSize: '14px', fontWeight: '500' }}>
          ✅ Completado
        </div>
      )}
    </div>
  )
}


// ─── Paywall ──────────────────────────────────────────────────────────────────

function Paywall() {
  return (
    <div style={{
      background: 'var(--amber-50)',
      border: '0.5px solid #FAC775',
      borderRadius: '16px',
      padding: '28px 24px',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</p>
      <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--amber-700)', marginBottom: '8px' }}>
        Contenido Premium
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--amber-500)', lineHeight: '1.6', marginBottom: '20px' }}>
        Este contenido forma parte del plan premium. Accedé a todos los audios, programas y ejercicios exclusivos.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button style={{
          background: 'var(--amber-700)', color: 'white', border: 'none',
          borderRadius: '10px', padding: '13px', fontSize: '15px', fontWeight: '500', cursor: 'pointer',
        }}>
          ✨ Suscribirme — $2.990/mes
        </button>
        <button style={{
          background: 'transparent', color: 'var(--amber-700)', border: '0.5px solid var(--amber-700)',
          borderRadius: '10px', padding: '12px', fontSize: '14px', cursor: 'pointer',
        }}>
          Ver plan anual — $24.900/año
        </button>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
        Cancelá cuando quieras
      </p>
    </div>
  )
}


// ─── Botón favorito ───────────────────────────────────────────────────────────

function FavoriteButton({ itemId, initialFav }) {
  const [isFav, setIsFav] = useState(initialFav)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    try {
      const res = await contentAPI.toggleFavorite(itemId)
      setIsFav(res.data.is_favorite)
    } catch {}
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        marginTop: '16px',
        width: '100%',
        padding: '13px',
        background: isFav ? 'var(--green-50)' : 'white',
        border: `0.5px solid ${isFav ? 'var(--green-100)' : 'var(--border)'}`,
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '500',
        color: isFav ? 'var(--green-700)' : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {isFav ? '💚 Guardado en favoritos' : '🤍 Guardar en favoritos'}
    </button>
  )
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Cargando...</p>
    </div>
  )
}

function ErrorScreen({ onBack }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <p style={{ fontSize: '40px', marginBottom: '12px' }}>😕</p>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>No se pudo cargar el contenido</p>
      <button className="btn-outline" onClick={onBack} style={{ maxWidth: '200px' }}>Volver</button>
    </div>
  )
}
