import { useState, useEffect, useRef } from 'react'
import { adminAPI } from '../../api/adminApi'

const EMPTY_FORM = {
  title: '', description: '', content_type: 'audio',
  category_id: '', duration_seconds: '', body_text: '',
  is_premium: false, is_featured: false, is_active: true, order: 0, tags: '',
}

export default function AdminContent() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(null) // item_id uploading
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const fileRef = useRef()

  const load = () => {
    adminAPI.listContent().then((r) => setItems(r.data)).catch(() => {})
    adminAPI.categories().then((r) => setCategories(r.data)).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const showMsg = (text, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 3000)
  }

  const handleEdit = (item) => {
    setForm({
      title: item.title || '',
      description: item.description || '',
      content_type: item.content_type,
      category_id: item.category_id || '',
      duration_seconds: item.duration_seconds || '',
      body_text: item.body_text || '',
      is_premium: item.is_premium,
      is_featured: item.is_featured,
      is_active: item.is_active,
      order: item.order || 0,
      tags: item.tags || '',
    })
    setEditingId(item.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        ...form,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : null,
        order: parseInt(form.order) || 0,
      }
      if (editingId) {
        await adminAPI.updateContent(editingId, data)
        showMsg('Contenido actualizado')
      } else {
        await adminAPI.createContent(data)
        showMsg('Contenido creado')
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

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este contenido?')) return
    await adminAPI.deleteContent(id).catch(() => {})
    showMsg('Eliminado')
    load()
  }

  const handleAudioUpload = async (itemId, file) => {
    setUploading(itemId)
    try {
      await adminAPI.uploadAudio(itemId, file)
      showMsg('Audio subido correctamente')
      load()
    } catch {
      showMsg('Error al subir el audio', false)
    }
    setUploading(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600' }}>Contenido</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{items.length} ítems en total</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(!showForm) }}
          style={{
            padding: '10px 18px', background: 'var(--green-500)', color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancelar' : '+ Nuevo contenido'}
        </button>
      </div>

      {/* Mensaje */}
      {msg && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
          background: msg.ok ? 'var(--green-50)' : '#FEF2F2',
          color: msg.ok ? 'var(--green-700)' : '#dc2626',
          fontSize: '14px', fontWeight: '500',
        }}>
          {msg.ok ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: 'white', border: '0.5px solid var(--border)',
          borderRadius: '12px', padding: '24px', marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '16px' }}>
            {editingId ? 'Editar contenido' : 'Nuevo contenido'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Label>Título</Label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Ej: Meditación para la ansiedad" />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select value={form.content_type} onChange={(v) => setForm({ ...form, content_type: v })}>
                <option value="audio">🎵 Audio</option>
                <option value="exercise">✍️ Ejercicio</option>
                <option value="breathing">💨 Respiración</option>
                <option value="text">📝 Texto</option>
              </Select>
            </div>

            <div>
              <Label>Categoría</Label>
              <Select value={form.category_id} onChange={(v) => setForm({ ...form, category_id: v })}>
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>

            <div>
              <Label>Duración (segundos)</Label>
              <input type="text" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} placeholder="Ej: 300 (5 minutos)" />
            </div>

            <div>
              <Label>Orden</Label>
              <input type="text" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} placeholder="0" />
            </div>

            <div style={{ gridColumn: '1/-1' }}>
              <Label>Descripción</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Descripción breve del contenido"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }}
              />
            </div>

            <div style={{ gridColumn: '1/-1' }}>
              <Label>Texto del ejercicio (opcional)</Label>
              <textarea
                value={form.body_text}
                onChange={(e) => setForm({ ...form, body_text: e.target.value })}
                rows={3}
                placeholder="Para ejercicios de texto o guías escritas"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }}
              />
            </div>

            <div>
              <Label>Tags (separados por coma)</Label>
              <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="ansiedad, respiración, calma" />
            </div>
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            {[
              { key: 'is_premium', label: '🔒 Premium' },
              { key: 'is_featured', label: '⭐ Destacado' },
              { key: 'is_active', label: '✅ Activo' },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>

          <button type="submit" disabled={saving} style={{
            padding: '11px 24px', background: 'var(--green-500)', color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer',
          }}>
            {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear contenido'}
          </button>
        </form>
      )}

      {/* Tabla de contenido */}
      <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        {items.length === 0 ? (
          <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay contenido todavía</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
                {['Título', 'Tipo', 'Categoría', 'Duración', 'Estado', 'Audio', 'Acciones'].map((h) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: i < items.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '12px 14px', maxWidth: '200px' }}>
                    <p style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.plays_count} reproducciones</p>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: '12px', background: 'var(--bg-tertiary)', padding: '3px 8px', borderRadius: '6px' }}>
                      {item.content_type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>{item.category || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {item.duration_seconds ? `${Math.round(item.duration_seconds / 60)} min` : '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {item.is_premium && <span style={{ fontSize: '11px', background: 'var(--amber-50)', color: 'var(--amber-700)', padding: '2px 6px', borderRadius: '6px' }}>Premium</span>}
                      {item.is_featured && <span style={{ fontSize: '11px', background: 'var(--green-50)', color: 'var(--green-700)', padding: '2px 6px', borderRadius: '6px' }}>Destacado</span>}
                      {!item.is_active && <span style={{ fontSize: '11px', background: '#FEF2F2', color: '#dc2626', padding: '2px 6px', borderRadius: '6px' }}>Inactivo</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {uploading === item.id ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Subiendo...</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.audio_file && (
                          <span style={{ fontSize: '12px', color: 'var(--green-700)' }}>✅ Subido</span>
                        )}
                        <label style={{ cursor: 'pointer' }}>
                          <span style={{
                            fontSize: '12px',
                            color: item.audio_file ? 'var(--text-secondary)' : 'var(--amber-700)',
                            textDecoration: 'underline',
                          }}>
                            {item.audio_file ? '🔄 Reemplazar' : '+ Subir MP3'}
                          </span>
                          <input
                            type="file"
                            accept="audio/*"
                            style={{ display: 'none' }}
                            onChange={(e) => e.target.files[0] && handleAudioUpload(item.id, e.target.files[0])}
                          />
                        </label>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleEdit(item)} style={{ padding: '5px 10px', fontSize: '12px', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        Editar
                      </button>
                      <button onClick={() => handleDelete(item.id)} style={{ padding: '5px 10px', fontSize: '12px', background: '#FEF2F2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Label({ children }) {
  return <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px' }}>{children}</p>
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: '100%', padding: '11px 12px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '14px', background: 'white', color: 'var(--text-primary)' }}
    >
      {children}
    </select>
  )
}
