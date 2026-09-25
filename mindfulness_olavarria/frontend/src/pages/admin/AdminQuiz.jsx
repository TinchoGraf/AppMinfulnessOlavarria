import { useState, useEffect } from 'react'
import { adminAPI } from '../../api/adminApi'

// Claves locales para las listas del formulario (preguntas/opciones nuevas no tienen id)
let nextKey = 1
const newKey = () => nextKey++

const newOption = () => ({ key: newKey(), option_text: '' })
const newQuestion = () => {
  const options = [newOption(), newOption()]
  return { key: newKey(), question_text: '', options, correct: null }
}
const emptyForm = (session) => ({
  title: `Repaso: ${session.title}`,
  is_active: true,
  questions: [newQuestion()],
})

// Quiz de la API → estado del formulario
function quizToForm(quiz) {
  return {
    title: quiz.title,
    is_active: quiz.is_active,
    questions: quiz.questions.map((q) => {
      const options = q.options.map((o) => ({ key: newKey(), option_text: o.option_text, is_correct: o.is_correct }))
      return {
        key: newKey(),
        question_text: q.question_text,
        options: options.map(({ key, option_text }) => ({ key, option_text })),
        correct: options.find((o) => o.is_correct)?.key ?? null,
      }
    }),
  }
}

// Estado del formulario → payload de la API
function formToPayload(form, withQuestions) {
  const payload = { title: form.title.trim(), is_active: form.is_active }
  if (withQuestions) {
    payload.questions = form.questions.map((q, i) => ({
      question_text: q.question_text.trim(),
      order: i + 1,
      options: q.options.map((o, j) => ({
        option_text: o.option_text.trim(),
        is_correct: o.key === q.correct,
        order: j + 1,
      })),
    }))
  }
  return payload
}

function validate(form, withQuestions) {
  if (!form.title.trim()) return 'El cuestionario necesita un título'
  if (!withQuestions) return null
  if (form.questions.length === 0) return 'Agregá al menos una pregunta'
  for (const [i, q] of form.questions.entries()) {
    const n = i + 1
    if (!q.question_text.trim()) return `La pregunta ${n} no tiene texto`
    if (q.options.length < 2) return `La pregunta ${n} necesita al menos 2 opciones`
    if (q.options.some((o) => !o.option_text.trim())) return `La pregunta ${n} tiene opciones vacías`
    if (!q.options.some((o) => o.key === q.correct)) return `Marcá la opción correcta de la pregunta ${n}`
  }
  return null
}


export default function AdminQuiz() {
  const [programs, setPrograms] = useState([])
  const [programId, setProgramId] = useState('')
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  // { sessionId, quizId, locked, form } — sesión que se está editando
  const [editing, setEditing] = useState(null)
  const [openingId, setOpeningId] = useState(null)
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const showMsg = (text, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 3000)
  }

  const loadSessions = (id) =>
    adminAPI.programSessions(id)
      .then((r) => setSessions(r.data))
      .catch(() => showMsg('No se pudieron cargar las sesiones', false))
      .finally(() => setLoading(false))

  useEffect(() => {
    adminAPI.listPrograms()
      .then((r) => {
        setPrograms(r.data)
        if (r.data.length > 0) {
          const first = String(r.data[0].id)
          setProgramId(first)
          loadSessions(first)
        } else {
          setLoading(false)
        }
      })
      .catch(() => { showMsg('No se pudieron cargar los programas', false); setLoading(false) })
  }, [])

  const changeProgram = (id) => {
    setProgramId(id)
    setEditing(null)
    setLoading(true)
    loadSessions(id)
  }

  const openEditor = async (session) => {
    setFormError(null)
    if (!session.quiz) {
      setEditing({ sessionId: session.id, quizId: null, locked: false, form: emptyForm(session) })
      return
    }
    setOpeningId(session.id)
    try {
      const r = await adminAPI.sessionQuiz(session.id)
      setEditing({
        sessionId: session.id,
        quizId: r.data.id,
        locked: r.data.response_count > 0,
        form: quizToForm(r.data),
      })
    } catch {
      showMsg('No se pudo cargar el cuestionario', false)
    }
    setOpeningId(null)
  }

  const setForm = (updater) =>
    setEditing((e) => ({ ...e, form: typeof updater === 'function' ? updater(e.form) : updater }))

  const updateQuestion = (qKey, changes) =>
    setForm((f) => ({ ...f, questions: f.questions.map((q) => (q.key === qKey ? { ...q, ...changes } : q)) }))

  const handleSave = async () => {
    const withQuestions = !editing.locked
    const error = validate(editing.form, withQuestions)
    if (error) { setFormError(error); return }

    setSaving(true)
    setFormError(null)
    try {
      const payload = formToPayload(editing.form, withQuestions)
      if (editing.quizId) {
        await adminAPI.updateQuiz(editing.quizId, payload)
        showMsg('Cuestionario actualizado')
      } else {
        await adminAPI.createQuiz(editing.sessionId, payload)
        showMsg('Cuestionario creado')
      }
      setEditing(null)
      loadSessions(programId)
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error al guardar el cuestionario')
    }
    setSaving(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600' }}>Cuestionarios</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Un cuestionario por sesión. Las sesiones sin cuestionario pasan directo al video siguiente.
          </p>
        </div>
        <select value={programId} onChange={(e) => changeProgram(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: '260px' }}>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      {msg && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: msg.ok ? 'var(--green-50)' : '#FEF2F2', color: msg.ok ? 'var(--green-700)' : '#dc2626', fontSize: '14px' }}>
          {msg.ok ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {loading ? (
        <EmptyBox>Cargando...</EmptyBox>
      ) : sessions.length === 0 ? (
        <EmptyBox>{programs.length === 0 ? 'No hay programas todavía' : 'Este programa no tiene sesiones todavía'}</EmptyBox>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sessions.map((session) => {
            const isEditing = editing?.sessionId === session.id
            return (
              <div key={session.id} style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>
                      Día {session.day_number} — {session.title}
                    </p>
                    <QuizSummary quiz={session.quiz} />
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => openEditor(session)}
                      disabled={openingId === session.id}
                      style={session.quiz ? secondaryBtn : lightGreenBtn}
                    >
                      {openingId === session.id ? '...' : session.quiz ? 'Editar' : '+ Crear cuestionario'}
                    </button>
                  )}
                </div>

                {isEditing && (
                  <QuizEditor
                    editing={editing}
                    setForm={setForm}
                    updateQuestion={updateQuestion}
                    error={formError}
                    saving={saving}
                    onSave={handleSave}
                    onCancel={() => { setEditing(null); setFormError(null) }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


function QuizSummary({ quiz }) {
  if (!quiz) {
    return <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sin cuestionario · solo video</p>
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        📝 {quiz.title} · {quiz.question_count} pregunta{quiz.question_count === 1 ? '' : 's'}
      </p>
      {quiz.is_active
        ? <Badge bg="var(--green-50)" color="var(--green-700)">Activo</Badge>
        : <Badge bg="#FEF2F2" color="#dc2626">Inactivo</Badge>}
      {quiz.response_count > 0 && (
        <Badge bg="var(--bg-tertiary)" color="var(--text-secondary)">
          {quiz.response_count} respuesta{quiz.response_count === 1 ? '' : 's'}
        </Badge>
      )}
    </div>
  )
}


function QuizEditor({ editing, setForm, updateQuestion, error, saving, onSave, onCancel }) {
  const { form, locked, quizId } = editing

  const addQuestion = () => setForm((f) => ({ ...f, questions: [...f.questions, newQuestion()] }))
  const removeQuestion = (qKey) => setForm((f) => ({ ...f, questions: f.questions.filter((q) => q.key !== qKey) }))
  const moveQuestion = (index, delta) => setForm((f) => {
    const questions = [...f.questions]
    const target = index + delta
    if (target < 0 || target >= questions.length) return f
    ;[questions[index], questions[target]] = [questions[target], questions[index]]
    return { ...f, questions }
  })

  return (
    <div style={{ borderTop: '0.5px solid var(--border)', padding: '16px', background: 'var(--bg-secondary)' }}>
      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        {quizId ? 'EDITAR CUESTIONARIO' : 'NUEVO CUESTIONARIO'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end', marginBottom: '16px' }}>
        <div>
          <Label>Título</Label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Repaso de la clase 1" />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', paddingBottom: '10px' }}>
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          ✅ Activo
        </label>
      </div>

      {locked && (
        <div style={{ padding: '12px 14px', borderRadius: '8px', marginBottom: '16px', background: 'var(--amber-50)', color: 'var(--amber-700)', fontSize: '13px', lineHeight: '1.5' }}>
          🔒 Este cuestionario ya tiene respuestas de usuarios, así que las preguntas y opciones no se pueden modificar.
          Podés cambiar el título o desactivarlo (al desactivarlo, la sesión pasa a ser solo video).
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
        {form.questions.map((q, i) => (
          <div key={q.key} style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Label>Pregunta {i + 1}</Label>
              {!locked && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <IconBtn title="Subir" disabled={i === 0} onClick={() => moveQuestion(i, -1)}>↑</IconBtn>
                  <IconBtn title="Bajar" disabled={i === form.questions.length - 1} onClick={() => moveQuestion(i, 1)}>↓</IconBtn>
                  <IconBtn title="Eliminar pregunta" danger disabled={form.questions.length === 1} onClick={() => removeQuestion(q.key)}>✕</IconBtn>
                </div>
              )}
            </div>
            <input
              type="text"
              value={q.question_text}
              disabled={locked}
              onChange={(e) => updateQuestion(q.key, { question_text: e.target.value })}
              placeholder="Escribí la pregunta"
              style={{ marginBottom: '12px' }}
            />

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Opciones — marcá la correcta
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {q.options.map((o, j) => {
                const isCorrect = o.key === q.correct
                return (
                  <div key={o.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label
                      title="Opción correcta"
                      style={{ display: 'flex', alignItems: 'center', cursor: locked ? 'default' : 'pointer', flexShrink: 0 }}
                    >
                      <input
                        type="radio"
                        name={`correct-${q.key}`}
                        checked={isCorrect}
                        disabled={locked}
                        onChange={() => updateQuestion(q.key, { correct: o.key })}
                        style={{ accentColor: 'var(--green-500)', width: '16px', height: '16px', margin: 0 }}
                      />
                    </label>
                    <input
                      type="text"
                      value={o.option_text}
                      disabled={locked}
                      onChange={(e) => updateQuestion(q.key, {
                        options: q.options.map((x) => (x.key === o.key ? { ...x, option_text: e.target.value } : x)),
                      })}
                      placeholder={`Opción ${j + 1}`}
                      style={isCorrect ? { borderColor: 'var(--green-500)', background: 'var(--green-50)' } : undefined}
                    />
                    {!locked && (
                      <IconBtn
                        title="Eliminar opción"
                        danger
                        disabled={q.options.length <= 2}
                        onClick={() => updateQuestion(q.key, {
                          options: q.options.filter((x) => x.key !== o.key),
                          correct: isCorrect ? null : q.correct,
                        })}
                      >
                        ✕
                      </IconBtn>
                    )}
                  </div>
                )
              })}
            </div>
            {!locked && (
              <button
                onClick={() => updateQuestion(q.key, { options: [...q.options, newOption()] })}
                style={{ marginTop: '8px', padding: '4px 0', background: 'none', border: 'none', color: 'var(--green-700)', fontSize: '13px', cursor: 'pointer' }}
              >
                + Agregar opción
              </button>
            )}
          </div>
        ))}
      </div>

      {!locked && (
        <button onClick={addQuestion} style={{ ...lightGreenBtn, marginBottom: '16px' }}>
          + Agregar pregunta
        </button>
      )}

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', background: '#FEF2F2', color: '#dc2626', fontSize: '13px' }}>
          ❌ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onSave} disabled={saving} style={primaryBtn}>
          {saving ? 'Guardando...' : quizId ? 'Guardar cambios' : 'Crear cuestionario'}
        </button>
        <button onClick={onCancel} style={{ padding: '8px 16px', background: 'none', border: '0.5px solid var(--border)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}


function IconBtn({ children, danger, disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      {...props}
      style={{
        width: '28px', height: '28px', flexShrink: 0, borderRadius: '6px',
        border: '0.5px solid var(--border)', background: 'white', fontSize: '12px',
        color: danger ? '#dc2626' : 'var(--text-secondary)',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1,
      }}
    >
      {children}
    </button>
  )
}

function Badge({ children, bg, color }) {
  return <span style={{ fontSize: '11px', background: bg, color, padding: '2px 8px', borderRadius: '6px' }}>{children}</span>
}

function Label({ children }) {
  return <p style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>{children}</p>
}

function EmptyBox({ children }) {
  return (
    <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
      <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>{children}</p>
    </div>
  )
}

const selectStyle = { width: '100%', padding: '11px 12px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '14px', background: 'white' }
const primaryBtn = { padding: '8px 16px', background: 'var(--green-500)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }
const secondaryBtn = { padding: '6px 12px', fontSize: '13px', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }
const lightGreenBtn = { padding: '8px 14px', background: 'var(--green-50)', color: 'var(--green-700)', border: '0.5px solid var(--green-100)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }
