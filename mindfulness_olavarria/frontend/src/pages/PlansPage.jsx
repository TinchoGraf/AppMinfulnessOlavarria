import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paymentsAPI } from '../api/api'
import useAuthStore from '../store/authStore'

export default function PlansPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(null) // 'monthly' | 'yearly'
  const [error, setError] = useState(null)

  const handleSubscribe = async (plan) => {
    setLoading(plan)
    setError(null)
    try {
      const res = await paymentsAPI.createPreference(plan)
      const { sandbox_url, checkout_url } = res.data

      // En desarrollo usamos sandbox_url, en producción checkout_url
      // Cuando tengas las credenciales reales, cambiar a checkout_url
      const url = sandbox_url || checkout_url
      window.location.href = url

    } catch (err) {
      setError('No se pudo conectar con MercadoPago. Verificá las credenciales.')
      setLoading(null)
    }
  }

  if (user?.is_premium) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>✨</p>
        <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '8px', textAlign: 'center' }}>Ya tenés acceso premium</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', textAlign: 'center' }}>
          Disfrutá de todo el contenido de Mindfulness Olavarría
        </p>
        <button className="btn-primary" style={{ maxWidth: '240px' }} onClick={() => navigate('/')}>
          Ir al inicio
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #E1F5EE 0%, #f9fafb 50%)', padding: '32px 20px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Header */}
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', marginBottom: '24px' }}>←</button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>🌿</p>
          <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Accedé a todo el contenido</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Programas completos, audios exclusivos y herramientas para trabajar tu bienestar emocional.
          </p>
        </div>

        {/* Lo que incluye */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: '0.5px solid var(--border)' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Incluye</p>
          {[
            '🎵 Todos los audios de meditación',
            '📚 Programas guiados completos',
            '💨 Ejercicios de respiración',
            '✍️ Ejercicios cognitivos y emocionales',
            '📊 Seguimiento emocional avanzado',
            '🔄 Nuevos contenidos cada mes',
          ].map((item) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '14px' }}>
              <span style={{ color: 'var(--green-500)', fontWeight: '700' }}>✓</span>
              {item}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '0.5px solid #FCA5A5', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>
            ❌ {error}
          </div>
        )}

        {/* Plan anual — destacado */}
        <div style={{
          background: 'var(--green-500)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '12px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '12px', right: '12px',
            background: '#FFD700', color: '#333', fontSize: '11px',
            fontWeight: '700', padding: '4px 10px', borderRadius: '20px',
          }}>
            MEJOR VALOR
          </div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginBottom: '4px' }}>Plan anual</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
            <p style={{ color: 'white', fontSize: '32px', fontWeight: '700' }}>$24.900</p>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>/año</p>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginBottom: '20px' }}>
            Equivale a $2.075/mes — ahorrás $9.000 al año
          </p>
          <button
            onClick={() => handleSubscribe('yearly')}
            disabled={loading !== null}
            style={{
              width: '100%', padding: '14px',
              background: 'white', color: 'var(--green-700)',
              border: 'none', borderRadius: '10px',
              fontSize: '15px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            {loading === 'yearly' ? 'Redirigiendo...' : 'Suscribirme anual'}
          </button>
        </div>

        {/* Plan mensual */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          border: '0.5px solid var(--border)',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>Plan mensual</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
            <p style={{ fontSize: '32px', fontWeight: '700' }}>$2.990</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>/mes</p>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
            Cancelá cuando quieras
          </p>
          <button
            onClick={() => handleSubscribe('monthly')}
            disabled={loading !== null}
            className="btn-outline"
          >
            {loading === 'monthly' ? 'Redirigiendo...' : 'Suscribirme mensual'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          Pago seguro con MercadoPago · Sin renovación automática sorpresiva
        </p>
      </div>
    </div>
  )
}
