import client from './client'

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  me: () => client.get('/auth/me'),
  updateMe: (data) => client.put('/auth/me', data),
}

// ─── Contenido ────────────────────────────────────────────────────────────────
export const contentAPI = {
  list: (params) => client.get('/content/', { params }),
  featured: () => client.get('/content/featured'),
  categories: () => client.get('/content/categories'),
  detail: (id) => client.get(`/content/${id}`),
  toggleFavorite: (id) => client.post(`/content/${id}/favorite`),
  saveProgress: (id, data) => client.post(`/content/${id}/progress`, data),
}

// ─── Programas ────────────────────────────────────────────────────────────────
export const programsAPI = {
  list: () => client.get('/programs/'),
  detail: (id) => client.get(`/programs/${id}`),
  completeSession: (programId, sessionId) =>
    client.post(`/programs/${programId}/sessions/${sessionId}/complete`),
}

// ─── Emocional ────────────────────────────────────────────────────────────────
export const emotionalAPI = {
  log: (data) => client.post('/emotional/log', data),
  history: (days = 30) => client.get('/emotional/history', { params: { days } }),
  recommend: (state) => client.get('/emotional/recommend', { params: { state } }),
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export const statsAPI = {
  me: () => client.get('/stats/me'),
}

// ─── Pagos ────────────────────────────────────────────────────────────────────
export const paymentsAPI = {
  createPreference: (plan) => client.post('/payments/create-preference', { plan }),
  confirm: (params) => client.get('/payments/confirm', { params }),
  myPayments: () => client.get('/payments/my-payments'),
}
