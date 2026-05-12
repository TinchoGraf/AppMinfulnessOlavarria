import { useState, useEffect } from 'react'
import { adminAPI } from '../../api/adminApi'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAPI.users()
      .then((r) => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600' }}>Usuarios</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{users.length} usuarios registrados</p>
      </div>

      <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando...</p>
        ) : users.length === 0 ? (
          <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay usuarios todavía</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
                {['Nombre', 'Email', 'Plan', 'Rol', 'Registro'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.id} style={{ borderBottom: i < users.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%',
                        background: 'var(--green-50)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: 'var(--green-700)',
                        flexShrink: 0,
                      }}>
                        {user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <p style={{ fontWeight: '500' }}>{user.full_name}</p>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{user.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '12px', padding: '3px 8px', borderRadius: '6px',
                      background: user.is_premium ? 'var(--amber-50)' : 'var(--bg-tertiary)',
                      color: user.is_premium ? 'var(--amber-700)' : 'var(--text-secondary)',
                    }}>
                      {user.is_premium ? '✨ Premium' : '🆓 ' + user.plan}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '12px', padding: '3px 8px', borderRadius: '6px',
                      background: user.role === 'admin' ? '#EDE9FE' : 'var(--bg-tertiary)',
                      color: user.role === 'admin' ? '#5B21B6' : 'var(--text-secondary)',
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {new Date(user.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
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
