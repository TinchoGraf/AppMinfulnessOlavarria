import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/contenido', label: 'Contenido', icon: '🎵' },
  { to: '/programas', label: 'Programas', icon: '📚' },
  { to: '/perfil', label: 'Perfil', icon: '👤' },
]

export default function Layout() {
  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', position: 'relative', background: 'var(--bg-secondary)' }}>
      <main style={{ paddingBottom: '72px' }}>
        <Outlet />
      </main>

      {/* Nav inferior */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        background: 'white',
        borderTop: '0.5px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 0 12px',
        zIndex: 100,
      }}>
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              fontSize: '11px',
              fontWeight: '500',
              color: isActive ? 'var(--green-500)' : 'var(--text-secondary)',
              padding: '4px 16px',
              textDecoration: 'none',
            })}
          >
            <span style={{ fontSize: '20px' }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
