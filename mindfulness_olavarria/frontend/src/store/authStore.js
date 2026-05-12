import { create } from 'zustand'
import { authAPI } from '../api/api'

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const res = await authAPI.login({ email, password })
      const { access_token, user } = res.data
      localStorage.setItem('token', access_token)
      set({ token: access_token, user, loading: false })
      return { ok: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al iniciar sesión'
      set({ loading: false, error: msg })
      return { ok: false, error: msg }
    }
  },

  register: async (fullName, email, password) => {
    set({ loading: true, error: null })
    try {
      const res = await authAPI.register({ full_name: fullName, email, password })
      const { access_token, user } = res.data
      localStorage.setItem('token', access_token)
      set({ token: access_token, user, loading: false })
      return { ok: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al registrarse'
      set({ loading: false, error: msg })
      return { ok: false, error: msg }
    }
  },

  fetchMe: async () => {
    try {
      const res = await authAPI.me()
      set({ user: res.data })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null })
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
}))

export default useAuthStore
