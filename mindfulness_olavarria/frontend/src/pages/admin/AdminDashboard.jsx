import { useState, useEffect } from 'react'
import { adminAPI } from '../../api/adminApi'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    adminAPI.stats().then((r) => setStats(r.data)).catch(() => {})
  }, [])

  const cards = stats ? [
    { label: 'Usuarios totales', value: stats.total_users, icon: '👥', color: '#E6F1FB' },
    { label: 'Suscriptores premium', value: stats.premium_users, icon: '✨', color: '#FAEEDA' },
    { label: 'Usuarios gratuitos', value: stats.free_users, icon: '🆓', color: '#EAF3DE' },
    { label: 'Ítems de contenido', value: stats.total_content, icon: '🎵', color: '#E1F5EE' },
    { label: 'Programas', value: stats.total_programs, icon: '📚', color: '#EEEDFE' },
  ] : []

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>Dashboard</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Resumen general de Serenalma
        </p>
      </div>

      {!stats ? (
        <p style={{ color: 'var(--text-secondary)' }}>Cargando...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {cards.map(({ label, value, icon, color }) => (
            <div key={label} style={{
              background: 'white',
              border: '0.5px solid var(--border)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              <div style={{
                width: '40px', height: '40px',
                background: color,
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', marginBottom: '12px',
              }}>
                {icon}
              </div>
              <p style={{ fontSize: '28px', fontWeight: '600', color: 'var(--text-primary)' }}>{value}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{
        background: 'white',
        border: '0.5px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>Accesos rápidos</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { label: '+ Nuevo audio', href: '/admin/contenido' },
            { label: '+ Nuevo programa', href: '/admin/programas' },
            { label: 'Ver usuarios', href: '/admin/usuarios' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{
                padding: '9px 16px',
                background: 'var(--green-50)',
                color: 'var(--green-700)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                textDecoration: 'none',
                border: '0.5px solid var(--green-100)',
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
