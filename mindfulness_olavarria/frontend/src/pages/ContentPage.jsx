import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { contentAPI } from '../api/api'

const CONTENT_TYPES = [
  { key: '', label: 'Todo' },
  { key: 'audio', label: '🎵 Audios' },
  { key: 'breathing', label: '💨 Respiración' },
  { key: 'exercise', label: '✍️ Ejercicios' },
]

export default function ContentPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedType, setSelectedType] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    contentAPI.categories().then((r) => setCategories(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (selectedType) params.content_type = selectedType
    if (selectedCategory) params.category_slug = selectedCategory
    contentAPI.list(params)
      .then((r) => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedType, selectedCategory])

  const freeItems = items.filter((i) => !i.is_premium)
  const premiumItems = items.filter((i) => i.is_premium)

  return (
    <div>
      <div style={{ background: 'white', padding: '20px 16px 12px', borderBottom: '0.5px solid var(--border)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '14px' }}>Contenido</h1>

        {/* Filtro por tipo */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '10px' }}>
          {CONTENT_TYPES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedType(key)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '0.5px solid',
                borderColor: selectedType === key ? 'var(--green-500)' : 'var(--border)',
                background: selectedType === key ? 'var(--green-500)' : 'transparent',
                color: selectedType === key ? 'white' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filtro por categoría */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setSelectedCategory('')}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              border: '0.5px solid',
              borderColor: selectedCategory === '' ? 'var(--green-700)' : 'var(--border)',
              background: selectedCategory === '' ? 'var(--green-50)' : 'transparent',
              color: selectedCategory === '' ? 'var(--green-700)' : 'var(--text-muted)',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCategory(cat.slug)}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                border: '0.5px solid',
                borderColor: selectedCategory === cat.slug ? 'var(--green-700)' : 'var(--border)',
                background: selectedCategory === cat.slug ? 'var(--green-50)' : 'transparent',
                color: selectedCategory === cat.slug ? 'var(--green-700)' : 'var(--text-muted)',
                fontSize: '12px',
                whiteSpace: 'nowrap',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>Cargando...</p>
        ) : (
          <>
            {/* Contenido gratis */}
            {freeItems.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <p className="section-label">Gratis</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '0.5px solid var(--border)' }}>
                  {freeItems.map((item) => (
                    <ContentRow key={item.id} item={item} onClick={() => navigate(`/contenido/${item.id}`)} />
                  ))}
                </div>
              </div>
            )}

            {/* Contenido premium */}
            {premiumItems.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--amber-700)', fontWeight: '500', background: 'var(--amber-50)', padding: '3px 10px', borderRadius: '20px' }}>
                    🔒 Premium
                  </span>
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '0.5px solid var(--border)', opacity: 0.8 }}>
                  {premiumItems.map((item) => (
                    <ContentRow key={item.id} item={item} onClick={() => navigate(`/contenido/${item.id}`)} />
                  ))}
                </div>

                {/* Paywall */}
                <div style={{
                  marginTop: '16px',
                  background: 'var(--amber-50)',
                  border: '0.5px solid #FAC775',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '16px', marginBottom: '4px' }}>✨</p>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--amber-700)', marginBottom: '4px' }}>
                    Accedé a todo el contenido
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--amber-500)', marginBottom: '12px' }}>
                    $2.990/mes · Cancelá cuando quieras
                  </p>
                  <button
                    style={{
                      background: 'var(--amber-700)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 24px',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    Ver planes
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ContentRow({ item, onClick }) {
  const typeIcon = { audio: '🎵', exercise: '✍️', breathing: '💨', video: '🎥', text: '📝' }
  const duration = item.duration_seconds ? `${Math.round(item.duration_seconds / 60)} min` : ''

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 14px',
        background: 'white',
        border: 'none',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: '40px', height: '40px',
        background: item.is_premium ? 'var(--amber-50)' : 'var(--green-50)',
        borderRadius: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px', flexShrink: 0,
      }}>
        {typeIcon[item.content_type] || '🎵'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {duration}{duration && ' · '}{item.category?.name}
          {item.is_completed && ' · ✅'}
        </p>
      </div>
      {item.is_premium
        ? <span style={{ fontSize: '16px' }}>🔒</span>
        : <span style={{ fontSize: '16px', color: 'var(--green-500)' }}>▶</span>
      }
    </button>
  )
}
