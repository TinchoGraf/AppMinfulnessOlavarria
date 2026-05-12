import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { paymentsAPI } from '../api/api'
import { authAPI } from '../api/api'
import useAuthStore from '../store/authStore'

// ─── Pago exitoso ─────────────────────────────────────────────────────────────
export function PaymentSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { fetchMe } = useAuthStore()
  const [status, setStatus] = useState('verifying') // verifying | confirmed | error

  useEffect(() => {
    const paymentId = searchParams.get('payment_id')
    const mpPaymentId = searchParams.get('payment_id') // MP también lo manda como collection_id
    const collectionId = searchParams.get('collection_id')
    const mpStatus = searchParams.get('collection_status') || searchParams.get('status')
    const plan = searchParams.get('plan')

    if (!paymentId) {
      setStatus('error')
      return
    }

    // Confirmar el pago con el backend
    paymentsAPI.confirm({
      payment_id: paymentId,
      mp_payment_id: collectionId || mpPaymentId,
      mp_status: mpStatus,
      plan,
    })
      .then(() => {
        setStatus('confirmed')
        // Actualizar datos del usuario para que is_premium sea true
        fetchMe()
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {status === 'verifying' && (
          <>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</p>
            <h1 style={titleStyle}>Verificando pago...</h1>
            <p style={subtitleStyle}>Un momento por favor</p>
          </>
        )}
        {status === 'confirmed' && (
          <>
            <p style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</p>
            <h1 style={{ ...titleStyle, color: 'var(--green-700)' }}>¡Suscripción activada!</h1>
            <p style={subtitleStyle}>
              Ya tenés acceso a todo el contenido de Mindfulness Olavarría.
            </p>
            <button className="btn-primary" style={{ marginTop: '24px', maxWidth: '240px' }} onClick={() => navigate('/')}>
              Ir al inicio 🌿
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</p>
            <h1 style={titleStyle}>Algo salió mal</h1>
            <p style={subtitleStyle}>
              Si tu pago fue procesado, tu suscripción se activará en unos minutos.
              Si el problema persiste, contactanos.
            </p>
            <button className="btn-primary" style={{ marginTop: '24px', maxWidth: '240px' }} onClick={() => navigate('/')}>
              Ir al inicio
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Pago fallido ─────────────────────────────────────────────────────────────
export function PaymentFailure() {
  const navigate = useNavigate()
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>😕</p>
        <h1 style={titleStyle}>El pago no se completó</h1>
        <p style={subtitleStyle}>
          Podés intentarlo de nuevo cuando quieras. Tu cuenta no fue modificada.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '24px', width: '100%', maxWidth: '280px' }}>
          <button className="btn-primary" onClick={() => navigate('/planes')}>
            Intentar de nuevo
          </button>
          <button className="btn-outline" onClick={() => navigate('/')}>
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pago pendiente ───────────────────────────────────────────────────────────
export function PaymentPending() {
  const navigate = useNavigate()
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</p>
        <h1 style={titleStyle}>Pago en proceso</h1>
        <p style={subtitleStyle}>
          Tu pago está siendo procesado. Cuando se confirme, tu suscripción se activará automáticamente.
          Te avisaremos por email.
        </p>
        <button className="btn-primary" style={{ marginTop: '24px', maxWidth: '240px' }} onClick={() => navigate('/')}>
          Ir al inicio
        </button>
      </div>
    </div>
  )
}

// ─── Estilos compartidos ──────────────────────────────────────────────────────
const pageStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background: 'linear-gradient(135deg, #E1F5EE 0%, #f9fafb 60%)',
}

const cardStyle = {
  background: 'white',
  borderRadius: '20px',
  padding: '40px 32px',
  textAlign: 'center',
  maxWidth: '420px',
  width: '100%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}

const titleStyle = {
  fontSize: '22px',
  fontWeight: '600',
  marginBottom: '10px',
  color: 'var(--text-primary)',
}

const subtitleStyle = {
  fontSize: '15px',
  color: 'var(--text-secondary)',
  lineHeight: '1.6',
}
