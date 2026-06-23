const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8787'

function getApiConnectionError(error) {
  const message = error instanceof Error ? error.message : 'No se pudo conectar con la API'
  if (message === 'Failed to fetch') return `No se pudo conectar con la API en ${API_BASE_URL}.`
  return message
}

function getStoredSession() {
  return {
    token: localStorage.getItem('token'),
    refreshToken: localStorage.getItem('refresh_token'),
    sessionId: localStorage.getItem('session_id'),
    usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),
  }
}

function storeSession({ token, refreshToken, sessionId, usuario }) {
  if (token) localStorage.setItem('token', token); else localStorage.removeItem('token')
  if (refreshToken) localStorage.setItem('refresh_token', refreshToken); else localStorage.removeItem('refresh_token')
  if (sessionId) localStorage.setItem('session_id', sessionId); else localStorage.removeItem('session_id')
  if (usuario) localStorage.setItem('usuario', JSON.stringify(usuario)); else localStorage.removeItem('usuario')
  window.dispatchEvent(new CustomEvent('auth:session-updated', { detail: { token, refreshToken, sessionId, usuario } }))
}

export function clearSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('session_id')
  localStorage.removeItem('usuario')
  window.dispatchEvent(new CustomEvent('auth:session-expired'))
}

async function rawRequest(path, options = {}) {
  const token = options.token
  const sessionId = options.sessionId ?? getStoredSession().sessionId
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) }
  if (token) headers.authorization = `Bearer ${token}`
  if (sessionId) headers['x-app-session-id'] = sessionId

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : null
  return { response, payload }
}

async function refreshSession() {
  const { refreshToken, sessionId } = getStoredSession()
  if (!refreshToken || !sessionId) return null
  const { response, payload } = await rawRequest('/auth/refresh', {
    method: 'POST', sessionId, body: { refresh_token: refreshToken, session_id: sessionId },
  })
  if (!response.ok || !payload?.ok) { clearSession(); return null }
  storeSession({ token: payload.data.token, refreshToken: payload.data.refresh_token, sessionId: payload.data.session_id, usuario: payload.data.usuario })
  return payload.data.token
}

async function request(path, options = {}) {
  try {
    let token = options.token
    let sessionId = options.sessionId
    let { response, payload } = await rawRequest(path, { ...options, token, sessionId })

    if (response.status === 401 && token) {
      const newToken = await refreshSession()
      if (newToken) {
        token = newToken
        sessionId = getStoredSession().sessionId
        ;({ response, payload } = await rawRequest(path, { ...options, token: newToken, sessionId }))
      }
    }
    if (response.status === 401) clearSession()
    if (!response.ok && payload) return payload
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` }
    return payload
  } catch (error) {
    return { ok: false, error: getApiConnectionError(error) }
  }
}

export const api = {
  seedAdmin: () => request('/auth/seed-admin', { method: 'POST' }),
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  me: ({ token }) => request('/auth/me', { token }),
  logout: ({ token }) => request('/auth/logout', { method: 'POST', token }),
  cambiarPassword: ({ token, nueva }) => request('/auth/change-password', { method: 'POST', token, body: { nueva } }),

  listarUsuarios: ({ token }) => request('/users', { token }),
  crearUsuario: ({ token, data }) => request('/users', { method: 'POST', token, body: { data } }),
  actualizarUsuario: ({ token, id, data }) => request(`/users/${id}`, { method: 'PATCH', token, body: { data } }),

  listarInsumos: ({ token } = {}) => request('/insumos', { token }),
  crearInsumo: ({ token, data }) => request('/insumos', { method: 'POST', token, body: { data } }),
  actualizarInsumo: ({ token, id, data }) => request(`/insumos/${id}`, { method: 'PATCH', token, body: { data } }),
  eliminarInsumo: ({ token, id }) => request(`/insumos/${id}`, { method: 'DELETE', token }),

  listarCards: ({ token }) => request('/cards', { token }),
  obtenerCard: ({ token, id }) => request(`/cards/${id}`, { token }),
  crearCard: ({ token, data }) => request('/cards', { method: 'POST', token, body: { data } }),
  actualizarCard: ({ token, id, data }) => request(`/cards/${id}`, { method: 'PATCH', token, body: { data } }),
  cambiarEstadoCard: ({ token, id, estado, mecanico_id, nota }) =>
    request(`/cards/${id}/estado`, { method: 'POST', token, body: { estado, mecanico_id, nota } }),

  crearServicioRealizado:    ({ token, data }) => request('/servicios-realizados', { method: 'POST', token, body: { data } }),
  actualizarServicioRealizado: ({ token, id, data }) => request(`/servicios-realizados/${id}`, { method: 'PATCH', token, body: { data } }),
  eliminarServicioRealizado: ({ token, id }) => request(`/servicios-realizados/${id}`, { method: 'DELETE', token }),

  crearReemplazo: ({ token, data }) => request('/reemplazos', { method: 'POST', token, body: { data } }),
  eliminarReemplazo: ({ token, id }) => request(`/reemplazos/${id}`, { method: 'DELETE', token }),

  crearTrabajoExterno: ({ token, data }) => request('/trabajos-externos', { method: 'POST', token, body: { data } }),
  eliminarTrabajoExterno: ({ token, id }) => request(`/trabajos-externos/${id}`, { method: 'DELETE', token }),

  configGet: ({ token }) => request('/config', { token }),
  configSet: ({ token, data }) => request('/config', { method: 'PUT', token, body: { data } }),

  reporteResumen:    ({ token, desde, hasta }) => request(`/reportes/resumen?desde=${desde}&hasta=${hasta}`, { token }),
  reporteMecanicos:  ({ token, desde, hasta }) => request(`/reportes/mecanicos?desde=${desde}&hasta=${hasta}`, { token }),
  reporteInsumos:    ({ token, desde, hasta }) => request(`/reportes/insumos?desde=${desde}&hasta=${hasta}`, { token }),
  reporteExternos:   ({ token, desde, hasta }) => request(`/reportes/externos?desde=${desde}&hasta=${hasta}`, { token }),
  reporteCards:      ({ token, desde, hasta }) => request(`/reportes/cards?desde=${desde}&hasta=${hasta}`, { token }),
  reporteClientes:   ({ token, desde, hasta }) => request(`/reportes/clientes?desde=${desde}&hasta=${hasta}`, { token }),
}

export { getStoredSession, refreshSession, storeSession }
