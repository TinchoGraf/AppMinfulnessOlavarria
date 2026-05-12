import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { programsAPI } from '../api/api'

export default function ProgramsPage() {
  const navigate = useNavigate()
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    programsAPI.list()
      .then((r) => setPrograms(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ background: 'white', padding: '20px 16px 16px', borderBottom: '0.5px solid var(--border)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600' }}>Programas</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Recorridos guiados para trabajar en profundidad
        </p>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>Cargando...</p>
        ) : programs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '40px', marginBottom: '12px' }}>📚</p>
            <p style={{ color: 'var(--text-secondary)' }}>Los programas están en camino</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {programs.map((program) => (
              <ProgramCard key={program.id} program={program} onClick={() => navigate(`/programas/${program.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProgramCard({ program, onClick }) {
  const progress = program.sessions_count > 0
    ? Math.round((program.user_progress_days / program.sessions_count) * 100)
    : 0

  return (
    <button
      onClick={onClick}
      style={{
        background: 'white',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        width: '100%',
        textAlign: 'left',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ flex: 1, marginRight: '12px' }}>
          <p style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>
            {program.title}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            {program.description?.slice(0, 80)}...
          </p>
        </div>
        <span className={`pill ${program.is_premium ? 'pill-amber' : 'pill-green'}`}>
          {program.is_premium ? '🔒 Premium' : 'Gratis'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
        {program.duration_days && <span>📅 {program.duration_days} días</span>}
        <span>📖 {program.sessions_count} sesiones</span>
        {program.category && <span>🏷️ {program.category.name}</span>}
      </div>

      {program.user_progress_days > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            <span>Progreso: día {program.user_progress_days}</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px' }}>
            <div style={{ height: '4px', width: `${progress}%`, background: 'var(--green-500)', borderRadius: '2px' }} />
          </div>
        </div>
      )}
    </button>
  )
}
