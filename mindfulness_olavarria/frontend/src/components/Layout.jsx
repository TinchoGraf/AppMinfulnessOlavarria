import { NavLink, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

const navItems = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/contenido', label: 'Contenido', icon: '🎵' },
  { to: '/programas', label: 'Programas', icon: '📚' },
  { to: '/perfil', label: 'Perfil', icon: '👤' },
]

// Mobile: nav inferior. Desktop (≥ 768px): Sidebar. El cambio lo hacen las
// media queries de index.css (.app-shell, .bottom-nav, .sidebar).
export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar navItems={navItems} />

      <main className="app-main">
        <Outlet />
      </main>

      {/* Nav inferior */}
      <nav className="bottom-nav">
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
