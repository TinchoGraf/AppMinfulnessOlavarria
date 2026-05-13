import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { contentAPI } from '../api/api'

// ─── Técnicas de respiración disponibles ─────────────────────────────────────
const TECHNIQUES = {
  '4-7-8': {
    name: 'Respiración 4-7-8',
    description: 'Calma el sistema nervioso rápidamente. Ideal para ansiedad.',
    phases: [
      { label: 'Inhalá', duration: 4, color: '#1D9E75', scale: 1.35 },
      { label: 'Retenéel aire', duration: 7, color: '#A4B4C8', scale: 1.35 },
      { label: 'Exhalá', duration: 8, color: '#C8A4A4', scale: 0.75 },
    ],
    cycles: 4,
  },
  'box': {
    name: 'Respiración cuadrada',
    description: 'Equilibra mente y cuerpo. Usada por atletas y fuerzas especiales.',
    phases: [
      { label: 'Inhalá', duration: 4, color: '#1D9E75', scale: 1.35 },
      { label: 'Retenéel aire', duration: 4, color: '#A4B4C8', scale: 1.35 },
      { label: 'Exhalá', duration: 4, color: '#C8A4A4', scale: 0.75 },
      { label: 'Retené vacío', duration: 4, color: '#C8C4A4', scale: 0.75 },
    ],
    cycles: 4,
  },
  'calma': {
    name: 'Respiración calmante',
    description: 'Simple y efectiva. Perfecta para principiantes.',
    phases: [
      { label: 'Inhalá', duration: 4, color: '#1D9E75', scale: 1.35 },
      { label: 'Exhalá', duration: 6, color: '#C8A4A4', scale: 0.75 },
    ],
    cycles: 6,
  },
}

export default function BreathingPlayer({ techniqueKey = '4-7-8', itemId, onComplete }) {
  const technique = TECHNIQUES[techniqueKey] || TECHNIQUES['4-7-8']
  const [status, setStatus] = useState('idle') // idle | running | done
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(technique.phases[0].duration)
  const [cycleCount, setCycleCount] = useState(0)
  const [scale, setScale] = useState(1)
  const intervalRef = useRef(null)
  const totalCycles = technique.cycles

  const currentPhase = technique.phases[phaseIndex]

  const start = () => {
    setStatus('running')
    setPhaseIndex(0)
    setTimeLeft(technique.phases[0].duration)
    setCycleCount(0)
    setScale(technique.phases[0].scale)
  }

  const stop = () => {
    clearInterval(intervalRef.current)
    setStatus('idle')
    setPhaseIndex(0)
    setTimeLeft(technique.phases[0].duration)
    setScale(1)
    setCycleCount(0)
  }

  useEffect(() => {
    if (status !== 'running') return

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Pasar a la siguiente fase
          setPhaseIndex((prevPhase) => {
            const nextPhase = (prevPhase + 1) % technique.phases.length
            const isNewCycle = nextPhase === 0

            if (isNewCycle) {
              setCycleCount((prevCycles) => {
                const newCycles = prevCycles + 1
                if (newCycles >= totalCycles) {
                  // Terminamos todos los ciclos
                  clearInterval(intervalRef.current)
                  setStatus('done')
                  if (itemId) {
                    contentAPI.saveProgress(itemId, {
                      progress_seconds: technique.phases.reduce((a, p) => a + p.duration, 0) * totalCycles,
                      completed: true,
                    })
                  }
                  if (onComplete) onComplete()
                }
                return newCycles
              })
            }

            setScale(technique.phases[nextPhase].scale)
            setTimeLeft(technique.phases[nextPhase].duration)
            return nextPhase
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [status, phaseIndex])

  const progressPct = ((technique.phases[phaseIndex].duration - timeLeft) / technique.phases[phaseIndex].duration) * 100

  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      padding: '32px 24px',
      border: '0.5px solid var(--border)',
      textAlign: 'center',
    }}>

      {status === 'done' ? (
        <DoneScreen cycleCount={totalCycles} technique={technique} onRestart={start} />
      ) : (
        <>
          {/* Fase actual */}
          <p style={{
            fontSize: '22px', fontWeight: '600',
            color: currentPhase.color,
            marginBottom: '6px',
            minHeight: '32px',
            transition: 'color 0.5s ease',
          }}>
            {status === 'idle' ? 'Listo para comenzar' : currentPhase.label}
          </p>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
            {status === 'idle'
              ? `${totalCycles} ciclos · ${technique.phases.map(p => p.duration).join('-')} segundos`
              : `${timeLeft} segundo${timeLeft !== 1 ? 's' : ''}`
            }
          </p>

          {/* Círculo animado */}
          <div style={{
            position: 'relative',
            width: '200px',
            height: '200px',
            margin: '0 auto 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {/* Anillo exterior */}
            <div style={{
              position: 'absolute',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              border: `3px solid ${currentPhase.color}20`,
            }} />

            {/* Círculo principal animado */}
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${currentPhase.color}30, ${currentPhase.color}10)`,
              border: `3px solid ${currentPhase.color}`,
              transform: status === 'running' ? `scale(${scale})` : 'scale(1)',
              transition: `transform ${currentPhase.duration}s ease-in-out, background 0.5s ease, border-color 0.5s ease`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: status === 'running' ? `0 0 40px ${currentPhase.color}30` : 'none',
            }}>
              <span style={{
                fontSize: '36px',
                transform: status === 'running' ? `scale(${1 / scale})` : 'scale(1)',
                transition: `transform ${currentPhase.duration}s ease-in-out`,
              }}>
                {status === 'idle' ? '🌬️' : phaseIndex % 2 === 0 ? '🌿' : '💨'}
              </span>
            </div>

            {/* Progreso circular (SVG) */}
            {status === 'running' && (
              <svg
                style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
                width="200" height="200"
              >
                <circle
                  cx="100" cy="100" r="96"
                  fill="none"
                  stroke={currentPhase.color}
                  strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 96}`}
                  strokeDashoffset={`${2 * Math.PI * 96 * (1 - progressPct / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
                />
              </svg>
            )}
          </div>

          {/* Contador de ciclos */}
          {status === 'running' && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
              {Array.from({ length: totalCycles }).map((_, i) => (
                <div key={i} style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: i < cycleCount ? 'var(--green-500)' : 'var(--bg-tertiary)',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
          )}

          {/* Fases visuales */}
          {status === 'idle' && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {technique.phases.map((phase, i) => (
                <div key={i} style={{
                  background: `${phase.color}15`,
                  border: `1px solid ${phase.color}40`,
                  borderRadius: '20px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  color: phase.color,
                  fontWeight: '500',
                }}>
                  {phase.label} {phase.duration}s
                </div>
              ))}
            </div>
          )}

          {/* Botones */}
          {status === 'idle' ? (
            <button
              onClick={start}
              style={{
                width: '100%', padding: '14px',
                background: 'var(--green-500)', color: 'white',
                border: 'none', borderRadius: '12px',
                fontSize: '16px', fontWeight: '500', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(29,158,117,0.3)',
              }}
            >
              ▶ Comenzar
            </button>
          ) : (
            <button
              onClick={stop}
              style={{
                width: '100%', padding: '13px',
                background: 'transparent', color: 'var(--text-secondary)',
                border: '0.5px solid var(--border)', borderRadius: '12px',
                fontSize: '15px', cursor: 'pointer',
              }}
            >
              ⏹ Detener
            </button>
          )}
        </>
      )}
    </div>
  )
}


// ─── Pantalla de finalización ─────────────────────────────────────────────────

function DoneScreen({ cycleCount, technique, onRestart }) {
  return (
    <div>
      <p style={{ fontSize: '48px', marginBottom: '12px' }}>🌿</p>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--green-700)', marginBottom: '8px' }}>
        ¡Muy bien!
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
        Completaste {cycleCount} ciclos de {technique.name}.
        Tomate un momento para notar cómo se siente tu cuerpo ahora.
      </p>
      <button
        onClick={onRestart}
        style={{
          width: '100%', padding: '13px',
          background: 'var(--green-50)', color: 'var(--green-700)',
          border: '0.5px solid var(--green-100)', borderRadius: '12px',
          fontSize: '15px', fontWeight: '500', cursor: 'pointer',
        }}
      >
        🔄 Repetir
      </button>
    </div>
  )
}
