import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paymentsAPI } from '../api/api'
import useAuthStore from '../store/authStore'

// Valores de ejemplo — se van a definir más adelante.
const PLANS = [
  {
    key: 'yearly',
    label: 'Plan anual',
    price: 29900,
    periodLabel: '/año',
    note: 'Equivale a $2.492/mes — 2 meses gratis',
    badge: 'MEJOR VALOR',
    highlight: true,
  },
  {
    key: 'quarterly',
    label: 'Plan trimestral',
    price: 7990,
    periodLabel: '/trimestre',
    note: 'Equivale a $2.663/mes',
    highlight: false,
  },
  {
    key: 'monthly',
    label: 'Plan mensual',
    price: 2990,
    periodLabel: '/mes',
    note: 'Cancelá cuando quieras',
    highlight: false,
  },
]

export default function PlansPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(null) // 'monthly' | 'quarterly' | 'yearly'
  const [error, setError] = useState(null)

  const handleSubscribe = async (plan) => {
    setLoading(plan)
    setError(null)
    try {
      const res = await paymentsAPI.createSubscription(plan)
      const { checkout_url } = res.data
      window.location.href = checkout_url

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

        {/* Planes */}
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            style={
              plan.highlight
                ? {
                    background: 'var(--green-500)',
                    borderRadius: '16px',
                    padding: '24px',
                    marginBottom: '12px',
                    position: 'relative',
                    overflow: 'hidden',
                  }
                : {
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    marginBottom: '12px',
                    border: '0.5px solid var(--border)',
                  }
            }
          >
            {plan.badge && (
              <div style={{
                position: 'absolute', top: '12px', right: '12px',
                background: '#FFD700', color: '#333', fontSize: '11px',
                fontWeight: '700', padding: '4px 10px', borderRadius: '20px',
              }}>
                {plan.badge}
              </div>
            )}
            <p style={{ color: plan.highlight ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
              {plan.label}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
              <p style={{ color: plan.highlight ? 'white' : 'var(--text-primary)', fontSize: '32px', fontWeight: '700' }}>
                ${plan.price.toLocaleString('es-AR')}
              </p>
              <p style={{ color: plan.highlight ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)', fontSize: '14px' }}>
                {plan.periodLabel}
              </p>
            </div>
            <p style={{ color: plan.highlight ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              {plan.note}
            </p>
            <button
              onClick={() => handleSubscribe(plan.key)}
              disabled={loading !== null}
              className={plan.highlight ? undefined : 'btn-outline'}
              style={
                plan.highlight
                  ? {
                      width: '100%', padding: '14px',
                      background: 'white', color: 'var(--green-700)',
                      border: 'none', borderRadius: '10px',
                      fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                    }
                  : undefined
              }
            >
              {loading === plan.key ? 'Redirigiendo...' : `Suscribirme ${plan.key === 'monthly' ? 'mensual' : plan.key === 'quarterly' ? 'trimestral' : 'anual'}`}
            </button>
          </div>
        ))}

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6', marginTop: '8px' }}>
          Pago seguro con MercadoPago · Suscripción con débito automático recurrente, cancelable cuando quieras
        </p>
      </div>
    </div>
  )
}
