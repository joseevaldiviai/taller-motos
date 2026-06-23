import { create } from 'zustand'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Cliente Supabase solo para Realtime (anon key, no service key)
let supabaseClient = null
function getSupabase() {
  if (!supabaseClient && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return supabaseClient
}

// ── VAPID helpers ─────────────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8787'

async function apiPost(path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function apiGet(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}) },
  })
  return res.json()
}

// ── Store ─────────────────────────────────────────────────────
const useNotificacionesStore = create((set, get) => ({
  notificaciones: [],       // lista in-app
  noLeidas: 0,
  pushActivo: false,        // si el navegador tiene push habilitado
  realtimeChannel: null,    // canal Supabase Realtime activo
  panelAbierto: false,

  // ── Cargar notificaciones iniciales ──────────────────────────
  cargar: async (token) => {
    const res = await apiGet('/notificaciones', token)
    if (res?.ok) {
      const lista = res.data || []
      set({ notificaciones: lista, noLeidas: lista.filter(n => !n.leida).length })
    }
  },

  // ── Marcar como leída ─────────────────────────────────────────
  marcarLeida: async (token, id) => {
    await apiPost(`/notificaciones/${id}/leer`, {}, token)
    set(s => {
      const lista = s.notificaciones.map(n => n.id === id ? { ...n, leida: true } : n)
      return { notificaciones: lista, noLeidas: lista.filter(n => !n.leida).length }
    })
  },

  marcarTodasLeidas: async (token) => {
    await apiPost('/notificaciones/leer-todas', {}, token)
    set(s => ({
      notificaciones: s.notificaciones.map(n => ({ ...n, leida: true })),
      noLeidas: 0,
    }))
  },

  // ── Agregar notificación nueva (desde Realtime) ───────────────
  agregarNotificacion: (notif) => {
    set(s => ({
      notificaciones: [notif, ...s.notificaciones].slice(0, 50),
      noLeidas: s.noLeidas + (notif.leida ? 0 : 1),
    }))
  },

  // ── Supabase Realtime ─────────────────────────────────────────
  iniciarRealtime: (usuarioId) => {
    const sb = getSupabase()
    if (!sb || !usuarioId) return

    const { realtimeChannel } = get()
    if (realtimeChannel) realtimeChannel.unsubscribe()

    const channel = sb
      .channel(`notificaciones:${usuarioId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `usuario_id=eq.${usuarioId}`,
      }, (payload) => {
        const notif = payload.new
        get().agregarNotificacion(notif)
        // toast in-app nativo del sistema
        if (!get().panelAbierto) {
          window.dispatchEvent(new CustomEvent('notif:nueva', { detail: notif }))
        }
      })
      .subscribe()

    set({ realtimeChannel: channel })
  },

  detenerRealtime: () => {
    const { realtimeChannel } = get()
    if (realtimeChannel) {
      realtimeChannel.unsubscribe()
      set({ realtimeChannel: null })
    }
  },

  // ── Web Push ──────────────────────────────────────────────────
  registrarPush: async (token) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Web Push no soportado en este navegador')
      return false
    }

    try {
      // Registrar service worker
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Pedir permiso
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { set({ pushActivo: false }); return false }

      // Obtener VAPID public key del servidor
      const cfgRes = await apiGet('/push/vapid-public-key', token)
      if (!cfgRes?.ok) return false
      const vapidPublicKey = cfgRes.data.public_key

      // Suscribir
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      const sub = subscription.toJSON()
      await apiPost('/push/suscribir', {
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth_key: sub.keys.auth,
        user_agent: navigator.userAgent,
      }, token)

      set({ pushActivo: true })

      // Escuchar mensajes del SW para navegación
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'NAVIGATE') {
          window.location.href = e.data.url
        }
      })

      return true
    } catch (err) {
      console.error('Error registrando push:', err)
      set({ pushActivo: false })
      return false
    }
  },

  cancelarPush: async (token) => {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await apiPost('/push/cancelar', { endpoint: sub.endpoint }, token)
          await sub.unsubscribe()
        }
      }
      set({ pushActivo: false })
    } catch (err) {
      console.error('Error cancelando push:', err)
    }
  },

  checkPushActivo: async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (!reg) { set({ pushActivo: false }); return }
      const sub = await reg.pushManager.getSubscription()
      const perm = Notification.permission
      set({ pushActivo: !!sub && perm === 'granted' })
    } catch { set({ pushActivo: false }) }
  },

  setPanelAbierto: (v) => set({ panelAbierto: v }),
}))

export default useNotificacionesStore
