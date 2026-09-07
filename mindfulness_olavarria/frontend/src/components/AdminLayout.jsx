import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import useAuthStore from "../store/authStore";


const navItems = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/contenido', label: 'Contenido', icon: '🎵' },
  { to: '/admin/programas', label: 'Programas', icon: '📚' },
  { to: '/admin/usuarios', label: 'Usuarios', icon: '👥' },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>

      {/* Sidebar */}
      <aside style={{
        width: '220px',
        background: 'white',
        borderRight: '0.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🌿</span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Admin Panel</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Serenalma</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                marginBottom: '2px',
                fontSize: '14px',
                fontWeight: isActive ? '500' : '400',
                color: isActive ? 'var(--green-700)' : 'var(--text-secondary)',
                background: isActive ? 'var(--green-50)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s',
              })}
            >
              <span>{icon}</span> {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--border)' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            {user?.full_name}
          </p>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '8px', fontSize: '13px',
              background: 'none', border: '0.5px solid var(--border)',
              borderRadius: '6px', color: '#dc2626', cursor: 'pointer',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main style={{ marginLeft: '220px', flex: 1, padding: '32px', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  )
}
