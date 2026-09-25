import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { programsAPI, mediaAPI } from '../api/api'
import { formatDateTime } from '../utils/dates'

export default function ProgramDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [program, setProgram] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [completing, setCompleting] = useState(null)
  // Paso abierto en un modal: { step: 'video' | 'quiz' | 'activity', session }
  const [modal, setModal] = useState(null)

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

  const openStep = (session, step) => {
    if (step === 'video') {
      if (session.video_status === 'locked') return
      if (session.content_item_id) {
        // Sesión con video: abrir el reproductor
        setModal({ step, session })
      } else if (session.video_status !== 'completed') {
        // Sesión sin video (formato viejo): comportamiento anterior
        handleComplete(session.id)
      }
      return
    }
    const status = step === 'quiz' ? session.quiz_status : session.activity_status
    if (status === 'available' || status === 'completed') setModal({ step, session })
  }

  // Abre el primer paso pendiente de la sesión (o el video, si ya está todo hecho)
  const openSession = (session) => {
    if (session.video_status === 'locked') return
    if (session.video_status !== 'completed') return openStep(session, 'video')
    if (session.quiz_status === 'available') return openStep(session, 'quiz')
    if (session.activity_status === 'available') return openStep(session, 'activity')
    openStep(session, 'video')
  }

  const closeModal = () => { setModal(null); load() }

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

      <div className="program-detail-body">

        {/* Columna izquierda (desktop): info del programa */}
        <div>
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
                {completing === nextSession.id ? '...' : nextSession.video_status === 'completed' ? 'Continuar' : 'Empezar'}
              </button>
            </div>
          </div>
        )}

        </div>

        {/* Columna derecha (desktop): sesiones */}
        <div>
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
              onOpenStep={(step) => openStep(session, step)}
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
      </div>

      {modal?.step === 'video' && (
        <VideoSessionModal
          programId={id}
          session={modal.session}
          onCompleted={load}
          onNext={() => setModal({ step: 'quiz', session: modal.session })}
          onClose={closeModal}
        />
      )}
      {modal?.step === 'quiz' && (
        <QuizModal
          programId={id}
          session={modal.session}
          onSubmitted={load}
          onNext={() => setModal({ step: 'activity', session: modal.session })}
          onClose={closeModal}
        />
      )}
      {modal?.step === 'activity' && (
        <ActivityModal
          programId={id}
          session={modal.session}
          onSaved={load}
          onClose={closeModal}
        />
      )}
    </div>
  )
}


// ─── Fila de sesión ───────────────────────────────────────────────────────────

function SessionRow({ session, isLast, onOpen, onOpenStep }) {
  const status = session.is_completed ? 'completed' : session.is_locked ? 'locked' : 'available'
  const hasSteps = session.quiz_status !== null
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

      {/* Sub-pasos: solo si la sesión tiene cuestionario cargado */}
      {hasSteps && (
        <div style={{ display: 'flex', gap: '6px', padding: '0 16px 14px 68px', flexWrap: 'wrap' }}>
          <StepChip icon="🎬" label="Video" status={session.video_status} onClick={() => onOpenStep('video')} />
          <StepChip icon="📝" label="Cuestionario" status={session.quiz_status} onClick={() => onOpenStep('quiz')} />
          <StepChip icon="💬" label="Registro" status={session.activity_status} onClick={() => onOpenStep('activity')} />
        </div>
      )}
    </div>
  )
}

function StepChip({ icon, label, status, onClick }) {
  const locked = status === 'locked'
  const done = status === 'completed'
  const stateIcon = locked ? '🔒' : done ? '✅' : null

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      title={locked ? 'Completá el paso anterior para desbloquear' : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '5px 10px', borderRadius: '999px', fontSize: '12px',
        fontWeight: '500', cursor: locked ? 'default' : 'pointer',
        border: `1px solid ${done ? 'var(--green-100)' : locked ? 'var(--border)' : 'var(--green-500)'}`,
        background: done ? 'var(--green-50)' : locked ? 'var(--bg-tertiary)' : 'white',
        color: done ? 'var(--green-700)' : locked ? 'var(--text-muted)' : 'var(--green-700)',
      }}
    >
      <span>{icon}</span> {label} {stateIcon && <span>{stateIcon}</span>}
    </button>
  )
}


// ─── Modal de video con desbloqueo progresivo ─────────────────────────────────

function VideoSessionModal({ programId, session, onCompleted, onNext, onClose }) {
  const hasQuiz = session.quiz_status !== null
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
        className="video-modal"
        style={{
          background: 'white', borderRadius: '16px', padding: '16px',
          maxHeight: '90vh', overflowY: 'auto',
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
              <>
                <p style={{ marginTop: '12px', textAlign: 'center', fontSize: '13px', color: 'var(--green-700)', fontWeight: '500' }}>
                  ✅ {hasQuiz ? 'Video completado' : 'Clase completada'}
                </p>
                {hasQuiz && (
                  <button onClick={onNext} style={{ ...primaryBtnStyle, marginTop: '10px' }}>
                    📝 Ir al cuestionario
                  </button>
                )}
              </>
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


// ─── Modal genérico ───────────────────────────────────────────────────────────

function ModalShell({ title, subtitle, onClose, children }) {
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
        className="video-modal"
        style={{
          background: 'white', borderRadius: '16px', padding: '20px',
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <div>
            {subtitle && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>{subtitle}</p>
            )}
            <p style={{ fontSize: '16px', fontWeight: '600', lineHeight: '1.4' }}>{title}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalMessage({ children }) {
  return (
    <p style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
      {children}
    </p>
  )
}


// ─── Modal de cuestionario ────────────────────────────────────────────────────

function QuizModal({ programId, session, onSubmitted, onNext, onClose }) {
  const [quiz, setQuiz] = useState(null)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState({})   // { [questionId]: optionId }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    programsAPI.quiz(programId, session.id)
      .then(async (r) => {
        setQuiz(r.data)
        if (r.data.is_answered) {
          const res = await programsAPI.quizResult(programId, session.id)
          setResult(res.data)
        }
      })
      .catch((err) => {
        const status = err.response?.status
        setError(status === 403 ? 'Completá el video para acceder al cuestionario.'
          : status === 404 ? 'Esta sesión no tiene cuestionario.'
          : 'No se pudo cargar el cuestionario. Probá de nuevo más tarde.')
      })
      .finally(() => setLoading(false))
  }, [programId, session.id])

  const allAnswered = quiz && quiz.questions.every((q) => selected[q.id])

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const answers = quiz.questions.map((q) => ({ question_id: q.id, option_id: selected[q.id] }))
      const r = await programsAPI.respondQuiz(programId, session.id, answers)
      setResult(r.data)
      onSubmitted()
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudieron enviar las respuestas.')
    }
    setSubmitting(false)
  }

  return (
    <ModalShell
      title={quiz?.title || 'Cuestionario'}
      subtitle={`Día ${session.day_number} — ${session.title}`}
      onClose={onClose}
    >
      {loading && <ModalMessage>Cargando cuestionario...</ModalMessage>}
      {!loading && !quiz && error && <ModalMessage>{error}</ModalMessage>}

      {!loading && quiz && result && <QuizResultView result={result} onNext={onNext} />}

      {!loading && quiz && !result && (
        <>
          {quiz.questions.map((q, i) => (
            <div key={q.id} style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '10px', lineHeight: '1.5' }}>
                {i + 1}. {q.question_text}
              </p>
              <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.options.map((o) => {
                  const checked = selected[q.id] === o.id
                  return (
                    <label
                      key={o.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                        fontSize: '14px', lineHeight: '1.4',
                        border: `1.5px solid ${checked ? 'var(--green-500)' : 'var(--border)'}`,
                        background: checked ? 'var(--green-50)' : 'white',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={checked}
                        onChange={() => setSelected((s) => ({ ...s, [q.id]: o.id }))}
                        style={{ accentColor: 'var(--green-500)', margin: 0, flexShrink: 0 }}
                      />
                      {o.option_text}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          {error && (
            <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '10px' }}>{error}</p>
          )}
          <button
            onClick={submit}
            disabled={!allAnswered || submitting}
            style={{ ...primaryBtnStyle, opacity: !allAnswered || submitting ? 0.5 : 1 }}
          >
            {submitting ? 'Enviando...' : 'Enviar respuestas'}
          </button>
          {!allAnswered && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
              Respondé todas las preguntas para enviar
            </p>
          )}
        </>
      )}
    </ModalShell>
  )
}

function QuizResultView({ result, onNext }) {
  return (
    <>
      <div style={{
        background: 'var(--green-50)', border: '1px solid var(--green-100)',
        borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center', marginBottom: '16px',
      }}>
        <p style={{ fontSize: '28px', fontWeight: '700', color: 'var(--green-700)' }}>
          {result.score} / {result.total}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--green-700)' }}>respuestas correctas</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {result.answers.map((a, i) => (
          <div
            key={a.question_id}
            style={{
              padding: '12px', borderRadius: '10px',
              border: `1px solid ${a.is_correct ? 'var(--green-100)' : '#fecaca'}`,
              background: a.is_correct ? 'white' : '#fef2f2',
            }}
          >
            <p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '6px', lineHeight: '1.4' }}>
              {a.is_correct ? '✅' : '❌'} {i + 1}. {a.question_text}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Tu respuesta: {a.selected_option_text}
            </p>
            {!a.is_correct && a.correct_option_text && (
              <p style={{ fontSize: '13px', color: 'var(--green-700)', marginTop: '2px' }}>
                Respuesta correcta: {a.correct_option_text}
              </p>
            )}
          </div>
        ))}
      </div>

      <button onClick={onNext} style={primaryBtnStyle}>
        💬 Ir al registro
      </button>
    </>
  )
}


// ─── Modal de registro emocional ──────────────────────────────────────────────

function ActivityModal({ programId, session, onSaved, onClose }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [text, setText] = useState('')
  const [writing, setWriting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    programsAPI.activities(programId, session.id)
      .then((r) => {
        setEntries(r.data.entries)
        setWriting(r.data.entries.length === 0)
      })
      .catch(() => setLoadError('No se pudieron cargar tus registros. Probá de nuevo más tarde.'))
      .finally(() => setLoading(false))
  }, [programId, session.id])

  const submit = async () => {
    if (!text.trim()) return
    setSaving(true)
    setError(null)
    try {
      const r = await programsAPI.addActivity(programId, session.id, text.trim())
      setEntries((prev) => [r.data.entry, ...prev])
      setText('')
      setWriting(false)
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo guardar el registro.')
    }
    setSaving(false)
  }

  return (
    <ModalShell
      title="Registro emocional"
      subtitle={`Día ${session.day_number} — ${session.title}`}
      onClose={onClose}
    >
      <div style={{
        background: 'var(--amber-50)', color: 'var(--amber-700)',
        borderRadius: '10px', padding: '12px 14px', fontSize: '13px',
        lineHeight: '1.5', marginBottom: '16px',
      }}>
        Este registro será leído por la Psicóloga Gabriela Ithurralde para acompañar tu avance en el curso.
      </div>

      {loading && <ModalMessage>Cargando...</ModalMessage>}
      {!loading && loadError && <ModalMessage>{loadError}</ModalMessage>}

      {!loading && !loadError && (
        <>
          {writing ? (
            <div style={{ marginBottom: '20px' }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="¿Qué sentiste, pensaste o notaste en esta clase?"
                rows={6}
                maxLength={5000}
                autoFocus
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  border: '1px solid var(--border-strong)', fontSize: '14px',
                  fontFamily: 'inherit', lineHeight: '1.5', resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              {error && (
                <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '6px' }}>{error}</p>
              )}
              <button
                onClick={submit}
                disabled={!text.trim() || saving}
                style={{ ...primaryBtnStyle, marginTop: '10px', opacity: !text.trim() || saving ? 0.5 : 1 }}
              >
                {saving ? 'Enviando...' : 'Enviar registro'}
              </button>
              {entries.length > 0 && (
                <button
                  onClick={() => { setWriting(false); setText(''); setError(null) }}
                  style={{ ...secondaryBtnStyle, marginTop: '8px' }}
                >
                  Cancelar
                </button>
              )}
            </div>
          ) : (
            <button onClick={() => setWriting(true)} style={{ ...secondaryBtnStyle, marginBottom: '20px' }}>
              ＋ Agregar otro registro
            </button>
          )}

          {entries.length > 0 && (
            <>
              <p className="section-label">Tus registros</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {entries.map((e) => (
                  <div key={e.id} style={{ border: '0.5px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      {formatDateTime(e.logged_at)}
                    </p>
                    <p style={{ fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{e.content}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </ModalShell>
  )
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

const primaryBtnStyle = {
  width: '100%', padding: '11px',
  background: 'var(--green-500)', color: 'white',
  border: 'none', borderRadius: '8px',
  fontSize: '14px', fontWeight: '500', cursor: 'pointer',
}

const secondaryBtnStyle = {
  width: '100%', padding: '10px',
  background: 'white', color: 'var(--green-700)',
  border: '1px solid var(--green-500)', borderRadius: '8px',
  fontSize: '14px', fontWeight: '500', cursor: 'pointer',
}

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
