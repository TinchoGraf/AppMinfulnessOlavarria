import { useState, useEffect } from 'react'
import { adminAPI } from '../../api/adminApi'

const EMPTY_FORM = { title: '', description: '', category_id: '', duration_days: '', is_premium: true, is_active: true, order: 0 }
const EMPTY_SESSION = { day_number: '', title: '', description: '', duration_minutes: '' }

export default function AdminPrograms() {
  const [programs, setPrograms] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION)
  const [showSessionForm, setShowSessionForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = () => {
    adminAPI.listPrograms().then((r) => setPrograms(r.data)).catch(() => {})
    adminAPI.categories().then((r) => setCategories(r.data)).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const showMsg = (text, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        ...form,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        duration_days: form.duration_days ? parseInt(form.duration_days) : null,
        order: parseInt(form.order) || 0,
      }
      if (editingId) {
        await adminAPI.updateProgram(editingId, data)
        showMsg('Programa actualizado')
      } else {
        await adminAPI.createProgram(data)
        showMsg('Programa creado')
      }
      setForm(EMPTY_FORM)
      setEditingId(null)
      setShowForm(false)
      load()
    } catch {
      showMsg('Error al guardar', false)
    }
    setSaving(false)
  }

  const handleAddSession = async (programId) => {
    try {
      await adminAPI.addSession(programId, {
        ...sessionForm,
        day_number: parseInt(sessionForm.day_number),
        duration_minutes: sessionForm.duration_minutes ? parseInt(sessionForm.duration_minutes) : null,
      })
      showMsg('Sesión agregada')
      setSessionForm(EMPTY_SESSION)
      setShowSessionForm(null)
      load()
    } catch {
      showMsg('Error al agregar sesión', false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600' }}>Programas</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{programs.length} programas</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(!showForm) }}
          style={{ padding: '10px 18px', background: 'var(--green-500)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
        >
          {showForm ? 'Cancelar' : '+ Nuevo programa'}
        </button>
      </div>

      {msg && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: msg.ok ? 'var(--green-50)' : '#FEF2F2', color: msg.ok ? 'var(--green-700)' : '#dc2626', fontSize: '14px' }}>
          {msg.ok ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* Formulario programa */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '16px' }}>{editingId ? 'Editar programa' : 'Nuevo programa'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Label>Título</Label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Ej: Regular la ansiedad en 21 días" />
            </div>
            <div>
              <Label>Categoría</Label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} style={selectStyle}>
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Duración (días)</Label>
              <input type="text" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} placeholder="Ej: 21" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <Label>Descripción</Label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            {[{ key: 'is_premium', label: '🔒 Premium' }, { key: 'is_active', label: '✅ Activo' }].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
          <button type="submit" disabled={saving} style={{ padding: '11px 24px', background: 'var(--green-500)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
            {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear programa'}
          </button>
        </form>
      )}

      {/* Lista de programas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {programs.map((program) => (
          <div key={program.id} style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <p style={{ fontSize: '15px', fontWeight: '500' }}>{program.title}</p>
                  {program.is_premium && <span style={{ fontSize: '11px', background: 'var(--amber-50)', color: 'var(--amber-700)', padding: '2px 8px', borderRadius: '6px' }}>Premium</span>}
                  {!program.is_active && <span style={{ fontSize: '11px', background: '#FEF2F2', color: '#dc2626', padding: '2px 8px', borderRadius: '6px' }}>Inactivo</span>}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {program.sessions_count} sesiones · {program.duration_days ? `${program.duration_days} días` : 'Sin duración'} · {program.category || 'Sin categoría'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setForm({ title: program.title, description: program.description || '', category_id: program.category_id || '', duration_days: program.duration_days || '', is_premium: program.is_premium, is_active: program.is_active, order: program.order }); setEditingId(program.id); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  style={{ padding: '6px 12px', fontSize: '13px', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Editar
                </button>
                <button onClick={() => setExpandedId(expandedId === program.id ? null : program.id)}
                  style={{ padding: '6px 12px', fontSize: '13px', background: 'var(--green-50)', color: 'var(--green-700)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  {expandedId === program.id ? 'Cerrar' : 'Sesiones'}
                </button>
              </div>
            </div>

            {/* Sesiones */}
            {expandedId === program.id && (
              <div style={{ borderTop: '0.5px solid var(--border)', padding: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '12px' }}>SESIONES</p>
                {program.sessions_count === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>No hay sesiones todavía</p>}

                {/* Formulario nueva sesión */}
                {showSessionForm === program.id ? (
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <Label>Día</Label>
                        <input type="text" value={sessionForm.day_number} onChange={(e) => setSessionForm({ ...sessionForm, day_number: e.target.value })} placeholder="1" />
                      </div>
                      <div>
                        <Label>Título</Label>
                        <input type="text" value={sessionForm.title} onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })} placeholder="Ej: Respiración consciente" />
                      </div>
                      <div>
                        <Label>Minutos</Label>
                        <input type="text" value={sessionForm.duration_minutes} onChange={(e) => setSessionForm({ ...sessionForm, duration_minutes: e.target.value })} placeholder="15" />
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <Label>Descripción</Label>
                      <input type="text" value={sessionForm.description} onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })} placeholder="Descripción breve de la sesión" />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleAddSession(program.id)} style={{ padding: '8px 16px', background: 'var(--green-500)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        Agregar sesión
                      </button>
                      <button onClick={() => setShowSessionForm(null)} style={{ padding: '8px 16px', background: 'none', border: '0.5px solid var(--border)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowSessionForm(program.id)} style={{ padding: '8px 14px', background: 'var(--green-50)', color: 'var(--green-700)', border: '0.5px solid var(--green-100)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', marginBottom: '8px' }}>
                    + Agregar sesión
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Label({ children }) {
  return <p style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>{children}</p>
}

const selectStyle = { width: '100%', padding: '11px 12px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '14px', background: 'white' }
