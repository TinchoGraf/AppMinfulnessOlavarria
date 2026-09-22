import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { programsAPI, mediaAPI } from '../api/api'

export default function ProgramDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [program, setProgram] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [completing, setCompleting] = useState(null)
  const [activeSession, setActiveSession] = useState(null)

  const load = () => {
    programsAPI.detail(id)
      .then((r) => setProgram(r.data))
      .catch((err) => {
        if (err.response?.status === 402) {
          setError('premium')
        } else {
          setError('not_found')
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleComplete = async (sessionId) => {
    setCompleting(sessionId)
    try {
      await programsAPI.completeSession(id, sessionId)
      load() // Recargar para actualizar progreso
    } catch {}
    setCompleting(null)
  }

  const openSession = (session) => {
    if (session.is_locked) return
    if (session.content_item_id) {
      // Sesión con video: abrir el reproductor
      setActiveSession(session)
    } else {
      // Sesión sin video (formato viejo): comportamiento anterior
      handleComplete(session.id)
    }
  }

  if (loading) return <LoadingScreen />

  if (error === 'premium') return (
    <div style={fullPageStyle}>
      <button onClick={() => navigate(-1)} style={backBtnStyle}>←</button>
      <div style={centerCardStyle}>
        <p style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</p>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Programa Premium</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
          Este programa requiere suscripción premium para acceder.
        </p>
        <button className="btn-primary" onClick={() => navigate('/planes')}>
          Ver planes
        </button>
      </div>
    </div>
  )

  if (error || !program) return (
    <div style={fullPageStyle}>
      <button onClick={() => navigate(-1)} style={backBtnStyle}>←</button>
      <div style={centerCardStyle}>
        <p style={{ fontSize: '48px', marginBottom: '12px' }}>😕</p>
        <p style={{ color: 'var(--text-secondary)' }}>No se pudo cargar el programa</p>
      </div>
    </div>
  )

  const completedDays = program.sessions.filter(s => s.is_completed).length
  const totalDays = program.sessions.length
  const progress = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0
  const nextSession = program.sessions.find(s => !s.is_completed)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>

      {/* Header con gradiente */}
      <div style={{
        background: 'linear-gradient(135deg, var(--green-500), var(--green-700))',
        padding: '20px 20px 32px',
        color: 'white',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: 'white', fontSize: '16px', cursor: 'pointer', marginBottom: '16px' }}
        >
          ← Volver
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{
            width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)',
            borderRadius: '14px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '28px', flexShrink: 0,
          }}>
            📚
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {program.category?.name || 'Programa'}
            </p>
            <h1 style={{ fontSize: '20px', fontWeight: '600', lineHeight: '1.3', marginBottom: '6px' }}>
              {program.title}
            </h1>
            {program.duration_days && (
              <p style={{ fontSize: '13px', opacity: 0.85 }}>
                📅 {program.duration_days} días · {totalDays} sesiones
              </p>
            )}
          </div>
        </div>

        {/* Barra de progreso */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', opacity: 0.9 }}>
            <span>Progreso: {completedDays} de {totalDays} días</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.3)', borderRadius: '3px' }}>
            <div style={{
              height: '6px', width: `${progress}%`,
              background: 'white', borderRadius: '3px',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Descripción */}
        {program.description && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              {program.description}
            </p>
          </div>
        )}

        {/* Próxima sesión destacada */}
        {nextSession && (
          <div style={{ marginBottom: '20px' }}>
            <p className="section-label">Próxima sesión</p>
            <div style={{
              background: 'var(--green-50)',
              border: '1.5px solid var(--green-100)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}>
              <div style={{
                width: '48px', height: '48px', background: 'var(--green-500)',
                borderRadius: '12px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontWeight: '700',
                fontSize: '16px', flexShrink: 0,
              }}>
                {nextSession.day_number}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: '500', color: 'var(--green-900)' }}>
                  {nextSession.title}
                </p>
                {nextSession.duration_minutes && (
                  <p style={{ fontSize: '12px', color: 'var(--green-700)', marginTop: '2px' }}>
                    ⏱️ {nextSession.duration_minutes} minutos
                  </p>
                )}
              </div>
              <button
                onClick={() => openSession(nextSession)}
                disabled={completing === nextSession.id}
                style={{
                  padding: '9px 16px', background: 'var(--green-500)',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {completing === nextSession.id ? '...' : 'Empezar'}
              </button>
            </div>
          </div>
        )}

        {/* Lista de todas las sesiones */}
        <p className="section-label">Todas las sesiones</p>
        <div style={{
          background: 'white',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}>
          {program.sessions.map((session, i) => (
            <SessionRow
              key={session.id}
              session={session}
              isLast={i === program.sessions.length - 1}
              onOpen={() => openSession(session)}
            />
          ))}

          {program.sessions.length === 0 && (
            <p style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Este programa aún no tiene sesiones cargadas
            </p>
          )}
        </div>

        {/* Completado! */}
        {completedDays === totalDays && totalDays > 0 && (
          <div style={{
            marginTop: '20px',
            background: 'var(--green-50)',
            border: '0.5px solid var(--green-100)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '40px', marginBottom: '8px' }}>🎉</p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--green-900)', marginBottom: '4px' }}>
              ¡Programa completado!
            </p>
            <p style={{ fontSize: '13px', color: 'var(--green-700)' }}>
              Completaste los {totalDays} días. Excelente trabajo.
            </p>
          </div>
        )}
      </div>

      {activeSession && (
        <VideoSessionModal
          programId={id}
          session={activeSession}
          onCompleted={load}
          onClose={() => { setActiveSession(null); load() }}
        />
      )}
    </div>
  )
}


// ─── Fila de sesión ───────────────────────────────────────────────────────────

function SessionRow({ session, isLast, onOpen }) {
  const status = session.is_completed ? 'completed' : session.is_locked ? 'locked' : 'available'
  const icon = status === 'completed' ? '✅' : status === 'locked' ? '🔒' : '▶'

  return (
    <div style={{ borderBottom: isLast ? 'none' : '0.5px solid var(--border)' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 16px',
          cursor: status === 'locked' ? 'default' : 'pointer',
          opacity: status === 'locked' ? 0.6 : 1,
        }}
        onClick={() => onOpen()}
      >
        {/* Indicador de día */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
          background: status === 'completed' ? 'var(--green-50)' : 'var(--bg-tertiary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
          fontWeight: '600',
          color: status === 'completed' ? 'var(--green-500)' : 'var(--text-secondary)',
        }}>
          {icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: '14px', fontWeight: '500',
            color: status === 'completed' ? 'var(--text-secondary)' : 'var(--text-primary)',
            textDecoration: status === 'completed' ? 'line-through' : 'none',
          }}>
            Día {session.day_number} — {session.title}
          </p>
          {status === 'locked' ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              🔒 Completá la clase anterior para desbloquear
            </p>
          ) : session.duration_minutes ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              ⏱️ {session.duration_minutes} min
            </p>
          ) : null}
        </div>

        {status !== 'locked' && (
          <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>›</span>
        )}
      </div>
    </div>
  )
}


// ─── Modal de video con desbloqueo progresivo ─────────────────────────────────

function VideoSessionModal({ programId, session, onCompleted, onClose }) {
  const [videoUrl, setVideoUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [justCompleted, setJustCompleted] = useState(session.is_completed)
  const [marking, setMarking] = useState(false)
  const completedRef = useRef(session.is_completed)

  useEffect(() => {
    setLoading(true)
    setError(null)
    mediaAPI.videoUrl(session.content_item_id)
      .then((r) => setVideoUrl(r.data.video_url))
      .catch((err) => {
        const status = err.response?.status
        if (status === 402) setError('premium')
        else if (status === 403) setError('locked')
        else if (status === 404) setError('not_found')
        else setError('generic')
      })
      .finally(() => setLoading(false))
  }, [session.content_item_id])

  const markComplete = async () => {
    if (completedRef.current) return
    completedRef.current = true
    setMarking(true)
    try {
      await programsAPI.completeSession(programId, session.id)
      setJustCompleted(true)
      onCompleted() // refresca la lista para desbloquear la siguiente sesión
    } catch {
      completedRef.current = false
    }
    setMarking(false)
  }

  const handleTimeUpdate = (e) => {
    const video = e.target
    if (!video.duration) return
    if (video.currentTime / video.duration >= 0.9) {
      markComplete()
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white', borderRadius: '16px', padding: '16px',
          maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
          <p style={{ fontSize: '15px', fontWeight: '600', lineHeight: '1.4' }}>
            Día {session.day_number} — {session.title}
          </p>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {loading && (
          <p style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Cargando video...
          </p>
        )}

        {!loading && error && (
          <p style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {error === 'premium' && '🔒 Necesitás suscripción premium para ver este video.'}
            {error === 'locked' && '🔒 Completá la clase anterior para desbloquear esta.'}
            {error === 'not_found' && 'El video de esta clase aún no fue subido.'}
            {error === 'generic' && 'No se pudo cargar el video. Probá de nuevo más tarde.'}
          </p>
        )}

        {!loading && videoUrl && (
          <>
            <video
              src={videoUrl}
              controls
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              onEnded={markComplete}
              style={{ width: '100%', borderRadius: '10px', display: 'block' }}
            />

            {justCompleted ? (
              <p style={{ marginTop: '12px', textAlign: 'center', fontSize: '13px', color: 'var(--green-700)', fontWeight: '500' }}>
                ✅ Clase completada
              </p>
            ) : (
              <button
                onClick={markComplete}
                disabled={marking}
                style={{
                  marginTop: '12px', width: '100%', padding: '11px',
                  background: 'var(--green-500)', color: 'white',
                  border: 'none', borderRadius: '8px',
                  fontSize: '14px', fontWeight: '500', cursor: 'pointer',
                }}
              >
                {marking ? 'Guardando...' : '✅ Marcar como visto'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullPageStyle = {
  minHeight: '100vh',
  padding: '20px',
  background: 'var(--bg-secondary)',
}

const backBtnStyle = {
  background: 'none', border: 'none',
  fontSize: '20px', cursor: 'pointer',
  marginBottom: '24px', display: 'block',
}

const centerCardStyle = {
  background: 'white',
  borderRadius: 'var(--radius-md)',
  padding: '32px 24px',
  textAlign: 'center',
  maxWidth: '360px',
  margin: '0 auto',
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-secondary)' }}>Cargando programa...</p>
    </div>
  )
}
