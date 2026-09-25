import { useState, useEffect } from 'react'
import { adminAPI } from '../../api/adminApi'
import { formatDateTime } from '../../utils/dates'

export default function AdminCourseResponses() {
  const [programs, setPrograms] = useState([])
  const [programId, setProgramId] = useState('')
  const [responses, setResponses] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    adminAPI.listPrograms()
      .then((r) => {
        setPrograms(r.data)
        if (r.data.length > 0) setProgramId(String(r.data[0].id))
        else setLoading(false)
      })
      .catch(() => { setError('No se pudieron cargar los programas'); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!programId) return
    Promise.all([adminAPI.programResponses(programId), adminAPI.programActivities(programId)])
      .then(([r, a]) => {
        setResponses(r.data)
        setActivities(a.data)
      })
      .catch(() => setError('No se pudieron cargar las respuestas'))
      .finally(() => setLoading(false))
  }, [programId])

  const sessions = groupBySession(responses, activities)

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600' }}>Respuestas de cursos</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Cuestionarios y registros emocionales de cada sesión
          </p>
        </div>
        <select
          value={programId}
          onChange={(e) => {
            setProgramId(e.target.value)
            setLoading(true)
            setError(null)
          }}
          style={{
            padding: '9px 12px', fontSize: '14px', borderRadius: '8px',
            border: '0.5px solid var(--border-strong)', background: 'white', minWidth: '260px',
          }}
        >
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      {error && <EmptyBox>{error}</EmptyBox>}
      {!error && loading && <EmptyBox>Cargando...</EmptyBox>}
      {!error && !loading && programId && sessions.length === 0 && (
        <EmptyBox>Todavía no hay respuestas ni registros en este programa</EmptyBox>
      )}

      {!error && !loading && sessions.map((s) => (
        <div
          key={s.session_id}
          style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '12px', marginBottom: '20px', overflow: 'hidden' }}
        >
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <p style={{ fontSize: '15px', fontWeight: '600' }}>Día {s.day_number} — {s.session_title}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {s.responses.length} cuestionario{s.responses.length === 1 ? '' : 's'} · {s.activities.length} registro{s.activities.length === 1 ? '' : 's'}
            </p>
          </div>

          <div style={{ padding: '16px' }}>
            <SectionTitle>📝 Cuestionario{s.responses[0] ? ` — ${s.responses[0].quiz_title}` : ''}</SectionTitle>
            {s.responses.length === 0 ? (
              <MutedText>Sin respuestas todavía</MutedText>
            ) : (
              <ResponsesTable rows={s.responses} />
            )}

            <div style={{ height: '20px' }} />

            <SectionTitle>💬 Registros emocionales</SectionTitle>
            {s.activities.length === 0 ? (
              <MutedText>Sin registros todavía</MutedText>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {s.activities.map((a) => (
                  <div key={a.id} style={{ border: '0.5px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <Avatar name={a.user_name} />
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '500' }}>{a.user_name}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatDateTime(a.logged_at)}</p>
                      </div>
                    </div>
                    <p style={{ fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{a.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}


function ResponsesTable({ rows }) {
  const [open, setOpen] = useState(null)   // user_id con el detalle desplegado

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
      <thead>
        <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
          {['Usuario', 'Fecha', 'Puntaje', ''].map((h) => (
            <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const isOpen = open === r.user_id
          const allGood = r.score === r.total
          return [
            <tr key={r.user_id} style={{ borderBottom: '0.5px solid var(--border)' }}>
              <td style={{ padding: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar name={r.user_name} />
                  <div>
                    <p style={{ fontWeight: '500' }}>{r.user_name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.user_email}</p>
                  </div>
                </div>
              </td>
              <td style={{ padding: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDateTime(r.answered_at)}</td>
              <td style={{ padding: '10px' }}>
                <span style={{
                  fontSize: '12px', padding: '3px 8px', borderRadius: '6px', fontWeight: '500',
                  background: allGood ? 'var(--green-50)' : 'var(--amber-50)',
                  color: allGood ? 'var(--green-700)' : 'var(--amber-700)',
                }}>
                  {r.score} / {r.total}
                </span>
              </td>
              <td style={{ padding: '10px', textAlign: 'right' }}>
                <button
                  onClick={() => setOpen(isOpen ? null : r.user_id)}
                  style={{ background: 'none', border: 'none', color: 'var(--green-700)', fontSize: '13px', cursor: 'pointer' }}
                >
                  {isOpen ? 'Ocultar' : 'Ver respuestas'}
                </button>
              </td>
            </tr>,
            isOpen && (
              <tr key={`${r.user_id}-detail`} style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <td colSpan={4} style={{ padding: '10px 16px' }}>
                  {r.answers.map((a) => (
                    <p key={a.question_id} style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      {a.is_correct ? '✅' : '❌'} <strong style={{ fontWeight: '500' }}>{a.question_text}</strong>
                      <span style={{ color: 'var(--text-secondary)' }}> — {a.option_text}</span>
                    </p>
                  ))}
                </td>
              </tr>
            ),
          ]
        })}
      </tbody>
    </table>
  )
}


// Agrupa respuestas y registros por sesión, ordenadas por día
function groupBySession(responses, activities) {
  const map = new Map()
  const get = (item) => {
    if (!map.has(item.session_id)) {
      map.set(item.session_id, {
        session_id: item.session_id,
        day_number: item.day_number,
        session_title: item.session_title,
        responses: [],
        activities: [],
      })
    }
    return map.get(item.session_id)
  }
  responses.forEach((r) => get(r).responses.push(r))
  activities.forEach((a) => get(a).activities.push(a))
  return [...map.values()].sort((a, b) => a.day_number - b.day_number)
}

function Avatar({ name }) {
  return (
    <div style={{
      width: '32px', height: '32px', borderRadius: '50%',
      background: 'var(--green-50)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--green-700)',
      flexShrink: 0,
    }}>
      {name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
    </div>
  )
}

function SectionTitle({ children }) {
  return <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>{children}</p>
}

function MutedText({ children }) {
  return <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{children}</p>
}

function EmptyBox({ children }) {
  return (
    <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
      <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>{children}</p>
    </div>
  )
}
