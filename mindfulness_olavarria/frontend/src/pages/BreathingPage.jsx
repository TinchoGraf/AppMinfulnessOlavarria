import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BreathingPlayer from '../components/BreathingPlayer'

const TECHNIQUES = [
  {
    key: '4-7-8',
    name: 'Respiración 4-7-8',
    description: 'Calma la ansiedad rápidamente',
    icon: '😮‍💨',
    color: '#1D9E75',
    ideal: 'Ansiedad · Antes de dormir',
  },
  {
    key: 'box',
    name: 'Respiración cuadrada',
    description: 'Equilibra mente y cuerpo',
    icon: '⬛',
    color: '#A4B4C8',
    ideal: 'Estrés · Concentración',
  },
  {
    key: 'calma',
    name: 'Respiración calmante',
    description: 'Simple, para empezar',
    icon: '🌬️',
    color: '#C8A4A4',
    ideal: 'Principiantes · Cualquier momento',
  },
]

export default function BreathingPage() {
  const navigate = useNavigate()
  const { id } = useParams() // Si viene de un ítem de contenido
  const [selectedKey, setSelectedKey] = useState(null)
  const [completed, setCompleted] = useState(false)

  const handleComplete = () => setCompleted(true)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>

      {/* Header */}
      <div style={{
        background: 'white',
        padding: '16px 20px',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => selectedKey ? setSelectedKey(null) : navigate(-1)}
          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
        >
          ←
        </button>
        <div>
          <p style={{ fontSize: '16px', fontWeight: '500' }}>
            {selectedKey ? TECHNIQUES.find(t => t.key === selectedKey)?.name : 'Respiración consciente'}
          </p>
          {!selectedKey && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Elegí una técnica</p>
          )}
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>

        {!selectedKey ? (
          <>
            {/* Intro */}
            <div style={{
              background: 'var(--green-50)',
              border: '0.5px solid var(--green-100)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '24px' }}>💡</span>
              <p style={{ fontSize: '13px', color: 'var(--green-900)', lineHeight: '1.6' }}>
                Los ejercicios de respiración activan el sistema nervioso parasimpático, 
                reduciendo el estrés y la ansiedad en minutos.
              </p>
            </div>

            {/* Selector de técnica */}
            <p className="section-label">Elegí una técnica</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {TECHNIQUES.map((tech) => (
                <button
                  key={tech.key}
                  onClick={() => { setSelectedKey(tech.key); setCompleted(false) }}
                  style={{
                    background: 'white',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{
                    width: '52px', height: '52px',
                    borderRadius: '14px',
                    background: `${tech.color}15`,
                    border: `1.5px solid ${tech.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', flexShrink: 0,
                  }}>
                    {tech.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '15px', fontWeight: '500', marginBottom: '3px' }}>{tech.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{tech.description}</p>
                    <p style={{ fontSize: '11px', color: tech.color, fontWeight: '500' }}>Ideal para: {tech.ideal}</p>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '18px' }}>›</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Reproductor de respiración */}
            <BreathingPlayer
              techniqueKey={selectedKey}
              itemId={id}
              onComplete={handleComplete}
            />

            {/* Mensaje post-ejercicio */}
            {completed && (
              <div style={{
                marginTop: '16px',
                background: 'var(--green-50)',
                border: '0.5px solid var(--green-100)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '14px', color: 'var(--green-900)', fontWeight: '500', marginBottom: '4px' }}>
                  ✅ Ejercicio completado
                </p>
                <p style={{ fontSize: '13px', color: 'var(--green-700)' }}>
                  Quedá unos instantes en silencio y observá cómo te sentís.
                </p>
              </div>
            )}

            {/* Otras técnicas */}
            <div style={{ marginTop: '16px' }}>
              <p className="section-label">Otras técnicas</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {TECHNIQUES.filter(t => t.key !== selectedKey).map((tech) => (
                  <button
                    key={tech.key}
                    onClick={() => { setSelectedKey(tech.key); setCompleted(false) }}
                    style={{
                      background: 'white',
                      border: '0.5px solid var(--border)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{tech.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: '500' }}>{tech.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{tech.ideal}</p>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>›</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
