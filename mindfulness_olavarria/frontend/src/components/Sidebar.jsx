import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

// Navegación lateral para desktop (≥ 768px). En mobile se oculta vía CSS (.sidebar).
export default function Sidebar({ navItems }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px',
            background: 'var(--green-500)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', flexShrink: 0,
          }}>🌿</div>
          <div>
            <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Serenalma</p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Psicóloga Gabriela Ithurralde</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '4px',
              fontSize: '14px',
              fontWeight: isActive ? '500' : '400',
              color: isActive ? 'var(--green-700)' : 'var(--text-secondary)',
              background: isActive ? 'var(--green-50)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s',
            })}
          >
            <span style={{ fontSize: '18px' }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Usuario + cerrar sesión */}
      <div style={{ padding: '16px 20px', borderTop: '0.5px solid var(--border)' }}>
        <p style={{
          fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)',
          marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {user?.full_name}
        </p>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '9px', fontSize: '13px', fontWeight: '500',
            background: 'none', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)', color: '#dc2626',
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
