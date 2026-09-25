import client from './client'

export const adminAPI = {
  // Stats
  stats: () => client.get('/admin/stats'),

  // Usuarios
  users: () => client.get('/admin/users'),

  // Categorías
  categories: () => client.get('/admin/categories'),

  // Contenido
  listContent: () => client.get('/admin/content'),
  createContent: (data) => client.post('/admin/content', data),
  updateContent: (id, data) => client.put(`/admin/content/${id}`, data),
  deleteContent: (id) => client.delete(`/admin/content/${id}`),
  uploadAudio: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return client.post(`/admin/content/${id}/audio`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Programas
  listPrograms: () => client.get('/admin/programs'),
  createProgram: (data) => client.post('/admin/programs', data),
  updateProgram: (id, data) => client.put(`/admin/programs/${id}`, data),
  addSession: (programId, data) => client.post(`/admin/programs/${programId}/sessions`, data),
  deleteSession: (programId, sessionId) =>
    client.delete(`/admin/programs/${programId}/sessions/${sessionId}`),

  // Cuestionarios y registros de los cursos
  programSessions: (programId) => client.get(`/admin/programs/${programId}/sessions`),
  sessionQuiz: (sessionId) => client.get(`/admin/sessions/${sessionId}/quiz`),
  createQuiz: (sessionId, data) => client.post(`/admin/sessions/${sessionId}/quiz`, data),
  updateQuiz: (quizId, data) => client.put(`/admin/quiz/${quizId}`, data),
  programResponses: (programId) => client.get(`/admin/programs/${programId}/responses`),
  programActivities: (programId) => client.get(`/admin/programs/${programId}/activities`),
}
