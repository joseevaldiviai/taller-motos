/**
 * Taller Motos — Cloudflare Worker API
 * Mismo patrón que moto-system: JWT propio + Supabase service key
 */

import { createClient } from '@supabase/supabase-js'

// ── helpers ─────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type,authorization,x-app-session-id',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    },
  })
}

function ok(data)    { return json({ ok: true,  data }) }
function err(msg, s = 400) { return json({ ok: false, error: msg }, s) }

async function verifyJwt(token, secret) {
  const [h, p, sig] = token.split('.')
  if (!h || !p || !sig) return null
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const valid = await crypto.subtle.verify('HMAC', key,
    Uint8Array.from(atob(sig.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0)),
    enc.encode(`${h}.${p}`))
  if (!valid) return null
  return JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/')))
}

async function signJwt(payload, secret) {
  const enc = new TextEncoder()
  const header = btoa(JSON.stringify({ alg:'HS256', typ:'JWT' })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  const body   = btoa(JSON.stringify(payload)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  const key    = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign'])
  const sig    = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  return `${header}.${body}.${sigB64}`
}

async function authenticate(req, env) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const payload = await verifyJwt(token, env.JWT_SECRET)
  if (!payload || payload.exp < Date.now() / 1000) return null
  return payload
}

function sb(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
}

// ── router ───────────────────────────────────────────────────
export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type,authorization,x-app-session-id',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    }})

    const url  = new URL(req.url)
    const path = url.pathname
    const method = req.method
    let body = {}
    if (['POST','PATCH','PUT'].includes(method)) {
      try { body = await req.json() } catch {}
    }

    // ── AUTH ─────────────────────────────────────────────────
    if (path === '/auth/seed-admin' && method === 'POST') {
      const supabase = sb(env)
      const { data: existing } = await supabase.from('user_profiles').select('id').eq('rol','ADMIN').single()
      if (existing) return ok({ message: 'Admin ya existe' })

      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: 'admin@taller.local', password: 'Admin1234!', email_confirm: true,
      })
      if (authErr) return err(authErr.message)
      await supabase.from('user_profiles').insert({
        id: authData.user.id, email: 'admin@taller.local',
        username: 'admin', nombre: 'Administrador', rol: 'ADMIN', activo: true,
      })
      return ok({ message: 'Admin creado: admin@taller.local / Admin1234!' })
    }

    if (path === '/auth/login' && method === 'POST') {
      const supabase = sb(env)
      const { username, password } = body
      if (!username || !password) return err('Credenciales requeridas')

      const { data: profile } = await supabase.from('user_profiles')
        .select('*').eq('username', username).eq('activo', true).single()
      if (!profile) return err('Usuario no encontrado', 401)

      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: profile.email, password,
      })
      if (authErr) return err('Contraseña incorrecta', 401)

      const sessionId = crypto.randomUUID()
      const token = await signJwt({
        sub: profile.id, rol: profile.rol, session_id: sessionId,
        exp: Math.floor(Date.now()/1000) + 3600,
      }, env.JWT_SECRET)
      const refreshToken = await signJwt({
        sub: profile.id, type: 'refresh', session_id: sessionId,
        exp: Math.floor(Date.now()/1000) + 86400 * 7,
      }, env.JWT_SECRET)

      const usuario = {
        id: profile.id, username: profile.username, nombre: profile.nombre,
        rol: profile.rol, tipo_sueldo: profile.tipo_sueldo,
      }
      return ok({ token, refresh_token: refreshToken, session_id: sessionId, usuario })
    }

    if (path === '/auth/refresh' && method === 'POST') {
      const { refresh_token } = body
      if (!refresh_token) return err('Token requerido', 401)
      const payload = await verifyJwt(refresh_token, env.JWT_SECRET)
      if (!payload || payload.type !== 'refresh' || payload.exp < Date.now()/1000) return err('Token inválido', 401)

      const { data: profile } = await sb(env).from('user_profiles')
        .select('*').eq('id', payload.sub).eq('activo', true).single()
      if (!profile) return err('Usuario inactivo', 401)

      const sessionId = crypto.randomUUID()
      const token = await signJwt({
        sub: profile.id, rol: profile.rol, session_id: sessionId,
        exp: Math.floor(Date.now()/1000) + 3600,
      }, env.JWT_SECRET)
      const newRefresh = await signJwt({
        sub: profile.id, type: 'refresh', session_id: sessionId,
        exp: Math.floor(Date.now()/1000) + 86400 * 7,
      }, env.JWT_SECRET)

      const usuario = { id: profile.id, username: profile.username, nombre: profile.nombre, rol: profile.rol, tipo_sueldo: profile.tipo_sueldo }
      return ok({ token, refresh_token: newRefresh, session_id: sessionId, usuario })
    }

    if (path === '/auth/me' && method === 'GET') {
      const auth = await authenticate(req, env)
      if (!auth) return err('No autorizado', 401)
      const { data: profile } = await sb(env).from('user_profiles').select('*').eq('id', auth.sub).single()
      if (!profile) return err('No encontrado', 404)
      return ok({ usuario: { id: profile.id, username: profile.username, nombre: profile.nombre, rol: profile.rol, tipo_sueldo: profile.tipo_sueldo } })
    }

    if (path === '/auth/logout' && method === 'POST') {
      return ok({ message: 'Sesión cerrada' })
    }

    if (path === '/auth/change-password' && method === 'POST') {
      const auth = await authenticate(req, env)
      if (!auth) return err('No autorizado', 401)
      const { nueva } = body
      if (!nueva || nueva.length < 6) return err('La nueva contraseña debe tener al menos 6 caracteres')
      const { error } = await sb(env).auth.admin.updateUserById(auth.sub, { password: nueva })
      if (error) return err(error.message)
      return ok({ message: 'Contraseña actualizada' })
    }

    // ── USUARIOS ─────────────────────────────────────────────
    const auth = await authenticate(req, env)
    if (!auth) return err('No autorizado', 401)
    const supabase = sb(env)

    if (path === '/users' && method === 'GET') {
      if (auth.rol !== 'ADMIN') return err('Sin permiso', 403)
      const { data, error } = await supabase.from('user_profiles').select('*').order('creado_en')
      if (error) return err(error.message)
      return ok(data)
    }

    if (path === '/users' && method === 'POST') {
      if (auth.rol !== 'ADMIN') return err('Sin permiso', 403)
      const d = body.data || {}
      const { email, username, nombre, rol, password, tipo_sueldo, sueldo_base } = d
      if (!email || !username || !nombre || !rol || !password) return err('Faltan campos')

      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
      })
      if (authErr) return err(authErr.message)

      const { error: profileErr } = await supabase.from('user_profiles').insert({
        id: authData.user.id, email, username, nombre, rol,
        tipo_sueldo: rol === 'MECANICO' ? tipo_sueldo : null,
        sueldo_base: rol === 'MECANICO' ? sueldo_base : null,
        activo: true,
      })
      if (profileErr) return err(profileErr.message)
      return ok({ message: 'Usuario creado' })
    }

    if (path.startsWith('/users/') && method === 'PATCH') {
      if (auth.rol !== 'ADMIN') return err('Sin permiso', 403)
      const id = path.split('/')[2]
      const d = body.data || {}
      const update = {}
      if (d.nombre) update.nombre = d.nombre
      if (d.rol)    update.rol    = d.rol
      if (d.tipo_sueldo !== undefined) update.tipo_sueldo = d.tipo_sueldo
      if (d.sueldo_base !== undefined) update.sueldo_base = d.sueldo_base
      if (d.activo  !== undefined) update.activo  = d.activo
      const { error } = await supabase.from('user_profiles').update(update).eq('id', id)
      if (error) return err(error.message)
      if (d.password) {
        const { error: passErr } = await supabase.auth.admin.updateUserById(id, { password: d.password })
        if (passErr) return err(passErr.message)
      }
      return ok({ message: 'Usuario actualizado' })
    }

    // ── INSUMOS ───────────────────────────────────────────────
    if (path === '/insumos' && method === 'GET') {
      const { data, error } = await supabase.from('insumos').select('*').eq('activo', true).order('nombre')
      if (error) return err(error.message)
      return ok(data)
    }

    if (path === '/insumos' && method === 'POST') {
      if (auth.rol !== 'ADMIN') return err('Sin permiso', 403)
      const d = body.data || {}
      const { data, error } = await supabase.from('insumos').insert({
        nombre: d.nombre, precio: d.precio || 0, stock: d.stock || 0,
      }).select().single()
      if (error) return err(error.message)
      return ok(data)
    }

    if (path.startsWith('/insumos/') && method === 'PATCH') {
      if (auth.rol !== 'ADMIN') return err('Sin permiso', 403)
      const id = path.split('/')[2]
      const d = body.data || {}
      const { error } = await supabase.from('insumos').update(d).eq('id', id)
      if (error) return err(error.message)
      return ok({ message: 'Insumo actualizado' })
    }

    if (path.startsWith('/insumos/') && method === 'DELETE') {
      if (auth.rol !== 'ADMIN') return err('Sin permiso', 403)
      const id = path.split('/')[2]
      const { error } = await supabase.from('insumos').update({ activo: false }).eq('id', id)
      if (error) return err(error.message)
      return ok({ message: 'Insumo eliminado' })
    }

    // ── CARDS ─────────────────────────────────────────────────
    if (path === '/cards' && method === 'GET') {
      const { data, error } = await supabase.from('cards')
        .select(`*, mecanico:mecanico_id(id, nombre),
          servicios_realizados(*), reemplazos(*), trabajos_externos(*), trabajos_realizados(*, mecanico:mecanico_id(nombre))`)
        .order('creado_en', { ascending: false })
      if (error) return err(error.message)
      return ok(data)
    }

    if (path.startsWith('/cards/') && !path.includes('/estado') && method === 'GET') {
      const id = path.split('/')[2]
      const { data, error } = await supabase.from('cards')
        .select(`*, mecanico:mecanico_id(id, nombre),
          servicios_realizados(*), reemplazos(*), trabajos_externos(*), trabajos_realizados(*, mecanico:mecanico_id(nombre))`)
        .eq('id', id).single()
      if (error) return err(error.message)
      return ok(data)
    }

    if (path === '/cards' && method === 'POST') {
      const d = body.data || {}
      const { data, error } = await supabase.from('cards').insert({
        cliente_nombre: d.cliente_nombre,
        cliente_telefono: d.cliente_telefono,
        fecha: d.fecha || new Date().toISOString().slice(0,10),
        tipo_servicio: d.tipo_servicio,
        notas: d.notas,
        estado: 'NUEVO',
      }).select().single()
      if (error) return err(error.message)

      await supabase.from('trabajos_realizados').insert({
        card_id: data.id, mecanico_id: auth.sub,
        estado_desde: null, estado_hasta: 'NUEVO', nota: 'Card creada',
      })

      // Notificar nueva card
      await notificarCambioEstado({
        supabase, env,
        cardId: data.id,
        clienteNombre: data.cliente_nombre,
        estadoDesde: null,
        estadoHasta: 'NUEVO',
        mecanicoId: auth.sub,
        nota: 'Nueva orden registrada',
      })
      return ok(data)
    }

    if (path.startsWith('/cards/') && method === 'PATCH' && !path.includes('/estado')) {
      const id = path.split('/')[2]
      const d = body.data || {}
      const allowed = ['cliente_nombre','cliente_telefono','fecha','tipo_servicio','notas']
      const update = Object.fromEntries(Object.entries(d).filter(([k]) => allowed.includes(k)))
      update.actualizado_en = new Date().toISOString()
      const { error } = await supabase.from('cards').update(update).eq('id', id)
      if (error) return err(error.message)
      return ok({ message: 'Card actualizada' })
    }

    // ── CAMBIO DE ESTADO / ASIGNAR MECÁNICO ──────────────────
    if (path.includes('/estado') && method === 'POST') {
      const id = path.split('/')[2]
      const { estado, mecanico_id, nota } = body

      const { data: card } = await supabase.from('cards')
        .select('estado, mecanico_id, cliente_nombre').eq('id', id).single()
      if (!card) return err('Card no encontrada', 404)

      const update = { estado, actualizado_en: new Date().toISOString() }
      if (mecanico_id) update.mecanico_id = mecanico_id

      const { error } = await supabase.from('cards').update(update).eq('id', id)
      if (error) return err(error.message)

      await supabase.from('trabajos_realizados').insert({
        card_id: Number(id), mecanico_id: mecanico_id || auth.sub,
        estado_desde: card.estado, estado_hasta: estado,
        nota: nota || null,
      })

      // Notificar a todos los usuarios del cambio de estado
      await notificarCambioEstado({
        supabase, env,
        cardId: Number(id),
        clienteNombre: card.cliente_nombre,
        estadoDesde: card.estado,
        estadoHasta: estado,
        mecanicoId: mecanico_id || auth.sub,
        nota: nota || null,
      })

      return ok({ message: 'Estado actualizado' })
    }

    // ── SERVICIOS REALIZADOS ─────────────────────────────────
    if (path === '/servicios-realizados' && method === 'POST') {
      const d = body.data || {}
      if (!d.card_id || !d.nombre || d.precio === undefined) return err('Faltan campos: card_id, nombre, precio')
      const { data, error } = await supabase.from('servicios_realizados').insert({
        card_id: d.card_id,
        nombre: d.nombre,
        descripcion: d.descripcion || null,
        precio: parseFloat(d.precio),
      }).select().single()
      if (error) return err(error.message)
      return ok(data)
    }

    if (path.startsWith('/servicios-realizados/') && method === 'PATCH') {
      const id = path.split('/')[2]
      const d = body.data || {}
      const update = {}
      if (d.nombre !== undefined) update.nombre = d.nombre
      if (d.descripcion !== undefined) update.descripcion = d.descripcion
      if (d.precio !== undefined) update.precio = parseFloat(d.precio)
      const { error } = await supabase.from('servicios_realizados').update(update).eq('id', id)
      if (error) return err(error.message)
      return ok({ message: 'Servicio actualizado' })
    }

    if (path.startsWith('/servicios-realizados/') && method === 'DELETE') {
      const id = path.split('/')[2]
      const { error } = await supabase.from('servicios_realizados').delete().eq('id', id)
      if (error) return err(error.message)
      return ok({ message: 'Servicio eliminado' })
    }

    // ── REEMPLAZOS ────────────────────────────────────────────
    if (path === '/reemplazos' && method === 'POST') {
      const d = body.data || {}
      const { data, error } = await supabase.from('reemplazos').insert({
        card_id: d.card_id, insumo_id: d.insumo_id || null,
        nombre: d.nombre, precio: d.precio, cantidad: d.cantidad || 1,
      }).select().single()
      if (error) return err(error.message)
      return ok(data)
    }

    if (path.startsWith('/reemplazos/') && method === 'DELETE') {
      const id = path.split('/')[2]
      const { error } = await supabase.from('reemplazos').delete().eq('id', id)
      if (error) return err(error.message)
      return ok({ message: 'Reemplazo eliminado' })
    }

    // ── TRABAJOS EXTERNOS ─────────────────────────────────────
    if (path === '/trabajos-externos' && method === 'POST') {
      const d = body.data || {}
      const { data, error } = await supabase.from('trabajos_externos').insert({
        card_id: d.card_id, detalle: d.detalle,
        precio_final: d.precio_final, costo: d.costo || 0,
      }).select().single()
      if (error) return err(error.message)
      return ok(data)
    }

    if (path.startsWith('/trabajos-externos/') && method === 'DELETE') {
      const id = path.split('/')[2]
      const { error } = await supabase.from('trabajos_externos').delete().eq('id', id)
      if (error) return err(error.message)
      return ok({ message: 'Trabajo externo eliminado' })
    }

    // ── CONFIG ────────────────────────────────────────────────
    if (path === '/config' && method === 'GET') {
      const { data, error } = await supabase.from('config').select('*')
      if (error) return err(error.message)
      return ok(Object.fromEntries(data.map(r => [r.key, r.value])))
    }

    if (path === '/config' && method === 'PUT') {
      if (auth.rol !== 'ADMIN') return err('Sin permiso', 403)
      const d = body.data || {}
      for (const [key, value] of Object.entries(d)) {
        await supabase.from('config').upsert({ key, value: String(value) })
      }
      return ok({ message: 'Config actualizada' })
    }

    // ── REPORTES ──────────────────────────────────────────────
    const calcTotalCard = c =>
      (c.servicios_realizados || []).reduce((a, s) => a + (s.precio || 0), 0) +
      (c.reemplazos || []).reduce((a, r) => a + r.precio * r.cantidad, 0) +
      (c.trabajos_externos || []).reduce((a, t) => a + t.precio_final, 0)

    // resumen general
    if (path === '/reportes/resumen' && method === 'GET') {
      if (auth.rol !== 'ADMIN') return err('Sin permiso', 403)
      const desde = url.searchParams.get('desde') || '2000-01-01'
      const hasta = url.searchParams.get('hasta') || new Date().toISOString().slice(0,10)
      const { data: cards } = await supabase.from('cards')
        .select('id,cliente_nombre,fecha,tipo_servicio,estado,mecanico_id,servicios_realizados(precio),reemplazos(precio,cantidad),trabajos_externos(precio_final,costo)')
        .gte('fecha', desde).lte('fecha', hasta)
      const todas = cards || []
      const fin = todas.filter(c => c.estado === 'FINALIZADO')
      const ingreso_total     = fin.reduce((a, c) => a + calcTotalCard(c), 0)
      const costo_total       = fin.reduce((a, c) => a + (c.trabajos_externos||[]).reduce((b,t)=>b+(t.costo||0),0), 0)
      const ingreso_servicios = fin.reduce((a, c) => a + (c.servicios_realizados||[]).reduce((b,s)=>b+(s.precio||0),0), 0)
      const ingreso_reemplazos= fin.reduce((a, c) => a + (c.reemplazos||[]).reduce((b,r)=>b+r.precio*r.cantidad,0), 0)
      const ingreso_externos  = fin.reduce((a, c) => a + (c.trabajos_externos||[]).reduce((b,t)=>b+t.precio_final,0), 0)
      const por_servicio = {}
      fin.forEach(c => {
        if (!por_servicio[c.tipo_servicio]) por_servicio[c.tipo_servicio] = { cantidad:0, ingreso:0 }
        por_servicio[c.tipo_servicio].cantidad++
        por_servicio[c.tipo_servicio].ingreso += calcTotalCard(c)
      })
      const por_estado = {}
      todas.forEach(c => { por_estado[c.estado] = (por_estado[c.estado]||0)+1 })
      const por_mes = {}
      fin.forEach(c => {
        const mes = c.fecha.slice(0,7)
        if (!por_mes[mes]) por_mes[mes] = { ingreso:0, cantidad:0 }
        por_mes[mes].ingreso += calcTotalCard(c)
        por_mes[mes].cantidad++
      })
      return ok({
        periodo: { desde, hasta },
        totales: { cards_total:todas.length, cards_finalizadas:fin.length, ingreso_total, costo_total, margen_bruto:ingreso_total-costo_total, ingreso_servicios, ingreso_reemplazos, ingreso_externos },
        por_servicio,
        por_estado,
        por_mes: Object.entries(por_mes).sort(([a],[b])=>a.localeCompare(b)).map(([mes,v])=>({mes,...v})),
      })
    }

    // reporte mecánicos
    if (path === '/reportes/mecanicos' && method === 'GET') {
      if (auth.rol !== 'ADMIN') return err('Sin permiso', 403)
      const desde = url.searchParams.get('desde') || '2000-01-01'
      const hasta = url.searchParams.get('hasta') || new Date().toISOString().slice(0,10)
      const { data: mecanicos } = await supabase.from('user_profiles')
        .select('id,nombre,tipo_sueldo,sueldo_base').eq('rol','MECANICO').eq('activo',true)
      const { data: cards } = await supabase.from('cards')
        .select('mecanico_id,estado,fecha,tipo_servicio,cliente_nombre,servicios_realizados(precio),reemplazos(precio,cantidad),trabajos_externos(precio_final,costo)')
        .gte('fecha', desde).lte('fecha', hasta)
      const resumen = (mecanicos||[]).map(m => {
        const propias = (cards||[]).filter(c=>c.mecanico_id===m.id)
        const fin2    = propias.filter(c=>c.estado==='FINALIZADO')
        const total_servicios  = fin2.reduce((a,c)=>a+(c.servicios_realizados||[]).reduce((b,s)=>b+(s.precio||0),0),0)
        const total_reemplazos = fin2.reduce((a,c)=>a+(c.reemplazos||[]).reduce((b,r)=>b+r.precio*r.cantidad,0),0)
        const total_ext        = fin2.reduce((a,c)=>a+(c.trabajos_externos||[]).reduce((b,t)=>b+t.precio_final,0),0)
        const total_facturado  = total_servicios+total_reemplazos+total_ext
        return {
          id:m.id, nombre:m.nombre, tipo_sueldo:m.tipo_sueldo, sueldo_base:m.sueldo_base,
          cards_asignadas:propias.length, cards_finalizadas:fin2.length,
          total_servicios, total_reemplazos, total_ext, total_facturado,
          detalle: fin2.map(c=>({ cliente_nombre:c.cliente_nombre, fecha:c.fecha, tipo_servicio:c.tipo_servicio, total:calcTotalCard(c) })),
        }
      })
      return ok(resumen)
    }

    // reporte insumos usados
    if (path === '/reportes/insumos' && method === 'GET') {
      if (auth.rol !== 'ADMIN') return err('Sin permiso', 403)
      const desde = url.searchParams.get('desde') || '2000-01-01'
      const hasta = url.searchParams.get('hasta') || new Date().toISOString().slice(0,10)
      const { data: rows } = await supabase.from('reemplazos')
        .select('nombre,precio,cantidad,creado_en')
        .gte('creado_en', desde+'T00:00:00').lte('creado_en', hasta+'T23:59:59')
      const mapa = {}
      ;(rows||[]).forEach(r => {
        if (!mapa[r.nombre]) mapa[r.nombre] = { nombre:r.nombre, veces_usado:0, cantidad_total:0, ingreso_total:0 }
        mapa[r.nombre].veces_usado++
        mapa[r.nombre].cantidad_total += r.cantidad
        mapa[r.nombre].ingreso_total  += r.precio*r.cantidad
      })
      return ok(Object.values(mapa).sort((a,b)=>b.ingreso_total-a.ingreso_total))
    }

    // reporte trabajos externos + margen
    if (path === '/reportes/externos' && method === 'GET') {
      if (auth.rol !== 'ADMIN') return err('Sin permiso', 403)
      const desde = url.searchParams.get('desde') || '2000-01-01'
      const hasta = url.searchParams.get('hasta') || new Date().toISOString().slice(0,10)
      const { data: rows } = await supabase.from('trabajos_externos')
        .select('detalle,precio_final,costo,creado_en,card_id')
        .gte('creado_en', desde+'T00:00:00').lte('creado_en', hasta+'T23:59:59')
      const lista = (rows||[]).map(t=>({
        ...t,
        margen: t.precio_final-(t.costo||0),
        margen_pct: t.precio_final>0?Math.round(((t.precio_final-(t.costo||0))/t.precio_final)*100):0,
      }))
      return ok({
        lista,
        total_ingresos: lista.reduce((a,t)=>a+t.precio_final,0),
        total_costos:   lista.reduce((a,t)=>a+(t.costo||0),0),
        margen_total:   lista.reduce((a,t)=>a+t.margen,0),
      })
    }

    // reporte por cliente
    if (path === '/reportes/clientes' && method === 'GET') {
      if (auth.rol !== 'ADMIN') return err('Sin permiso', 403)
      const desde = url.searchParams.get('desde') || '2000-01-01'
      const hasta = url.searchParams.get('hasta') || new Date().toISOString().slice(0,10)
      const { data: cards } = await supabase.from('cards')
        .select('cliente_nombre,cliente_telefono,fecha,tipo_servicio,estado,servicios_realizados(precio),reemplazos(precio,cantidad),trabajos_externos(precio_final)')
        .gte('fecha', desde).lte('fecha', hasta)
      const mapa = {}
      ;(cards||[]).forEach(c => {
        const k = c.cliente_nombre.trim().toLowerCase()
        if (!mapa[k]) mapa[k] = { cliente_nombre:c.cliente_nombre, cliente_telefono:c.cliente_telefono||'', visitas:0, total_gastado:0, servicios:[] }
        mapa[k].visitas++
        mapa[k].total_gastado += calcTotalCard(c)
        mapa[k].servicios.push(c.tipo_servicio)
      })
      const lista = Object.values(mapa).sort((a,b)=>b.total_gastado-a.total_gastado)
      return ok(lista)
    }

    // reporte listado completo de cards
    if (path === '/reportes/cards' && method === 'GET') {
      if (auth.rol !== 'ADMIN') return err('Sin permiso', 403)
      const desde = url.searchParams.get('desde') || '2000-01-01'
      const hasta = url.searchParams.get('hasta') || new Date().toISOString().slice(0,10)
      const { data: cards } = await supabase.from('cards')
        .select('id,cliente_nombre,cliente_telefono,fecha,tipo_servicio,estado,mecanico:mecanico_id(nombre),servicios_realizados(precio),reemplazos(precio,cantidad),trabajos_externos(precio_final)')
        .gte('fecha', desde).lte('fecha', hasta).order('fecha',{ascending:false})
      const lista = (cards||[]).map(c=>({
        id:c.id, cliente_nombre:c.cliente_nombre, cliente_telefono:c.cliente_telefono||'',
        fecha:c.fecha, tipo_servicio:c.tipo_servicio, estado:c.estado,
        mecanico:c.mecanico?.nombre||'Sin asignar',
        total_servicios:(c.servicios_realizados||[]).reduce((a,s)=>a+(s.precio||0),0),
        total_reemplazos:(c.reemplazos||[]).reduce((a,r)=>a+r.precio*r.cantidad,0),
        total_externos:(c.trabajos_externos||[]).reduce((a,t)=>a+t.precio_final,0),
        total:calcTotalCard(c),
      }))
      return ok(lista)
    }

    // ── NOTIFICACIONES IN-APP ─────────────────────────────────
    if (path === '/notificaciones' && method === 'GET') {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', auth.sub)
        .order('creado_en', { ascending: false })
        .limit(50)
      if (error) return err(error.message)
      return ok(data)
    }

    if (path.match(/^\/notificaciones\/\d+\/leer$/) && method === 'POST') {
      const id = path.split('/')[2]
      const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('id', id)
        .eq('usuario_id', auth.sub)
      if (error) return err(error.message)
      return ok({ message: 'Marcada como leída' })
    }

    if (path === '/notificaciones/leer-todas' && method === 'POST') {
      const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('usuario_id', auth.sub)
        .eq('leida', false)
      if (error) return err(error.message)
      return ok({ message: 'Todas marcadas como leídas' })
    }

    // ── WEB PUSH — VAPID public key ───────────────────────────
    if (path === '/push/vapid-public-key' && method === 'GET') {
      const publicKey = env.VAPID_PUBLIC_KEY
      if (!publicKey) return err('VAPID no configurado', 500)
      return ok({ public_key: publicKey })
    }

    // ── WEB PUSH — Suscribir dispositivo ─────────────────────
    if (path === '/push/suscribir' && method === 'POST') {
      const { endpoint, p256dh, auth_key, user_agent } = body
      if (!endpoint || !p256dh || !auth_key) return err('Datos de suscripción incompletos')

      // Upsert por endpoint (mismo dispositivo no se duplica)
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          usuario_id: auth.sub,
          endpoint, p256dh, auth_key,
          user_agent: user_agent || null,
        }, { onConflict: 'endpoint' })
      if (error) return err(error.message)
      return ok({ message: 'Suscripción registrada' })
    }

    // ── WEB PUSH — Cancelar suscripción ──────────────────────
    if (path === '/push/cancelar' && method === 'POST') {
      const { endpoint } = body
      if (!endpoint) return err('endpoint requerido')
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint)
        .eq('usuario_id', auth.sub)
      if (error) return err(error.message)
      return ok({ message: 'Suscripción cancelada' })
    }

    return err('Ruta no encontrada', 404)
  }
}

// ── Función helper: crear notificaciones + enviar Web Push ────
// Llamar internamente desde cambiarEstado
export async function notificarCambioEstado({ supabase, env, cardId, clienteNombre, estadoDesde, estadoHasta, mecanicoId, nota }) {
  const ESTADOS_LABEL = {
    NUEVO: 'Nuevo', EN_CURSO: 'En Curso', PAUSADO: 'Pausado',
    TERMINADO: 'Terminado', PRUEBAS: 'Pruebas', FINALIZADO: 'Finalizado',
  }

  const titulo = `Orden #${cardId} — ${clienteNombre}`
  const cuerpo = estadoDesde
    ? `Estado cambió de ${ESTADOS_LABEL[estadoDesde] || estadoDesde} → ${ESTADOS_LABEL[estadoHasta] || estadoHasta}${nota ? `. ${nota}` : ''}`
    : `Nueva orden creada: ${ESTADOS_LABEL[estadoHasta] || estadoHasta}`

  // 1. Obtener todos los usuarios activos
  const { data: usuarios } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('activo', true)

  if (!usuarios?.length) return

  // 2. Insertar notificación in-app para cada usuario
  const notifRows = usuarios.map(u => ({
    usuario_id: u.id,
    tipo: 'ESTADO',
    titulo,
    cuerpo,
    card_id: cardId,
    leida: false,
  }))
  await supabase.from('notificaciones').insert(notifRows)

  // 3. Web Push — obtener suscripciones de todos los usuarios
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')

  if (!subs?.length || !env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) return

  const payload = JSON.stringify({ titulo, cuerpo, card_id: cardId })

  // Enviar push a cada suscripción en paralelo (ignorar errores individuales)
  await Promise.allSettled(
    subs.map(sub => sendWebPush({ sub, payload, env }))
  )
}

async function sendWebPush({ sub, payload, env }) {
  // Web Push con VAPID manual (sin librería externa en Worker)
  const audience = new URL(sub.endpoint).origin
  const now = Math.floor(Date.now() / 1000)

  const vapidHeader = await buildVapidHeader({
    audience,
    subject: `mailto:${env.VAPID_SUBJECT || 'admin@taller.local'}`,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    now,
  })

  const enc = new TextEncoder()
  const payloadBytes = enc.encode(payload)

  // Cifrado AES-128-GCM para Web Push (RFC 8291)
  const encrypted = await encryptWebPush({ payloadBytes, p256dh: sub.p256dh, auth: sub.auth_key })

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'authorization': vapidHeader,
      'content-type': 'application/octet-stream',
      'content-encoding': 'aes128gcm',
      'ttl': '86400',
      'urgency': 'normal',
    },
    body: encrypted,
  })

  // 410 Gone o 404 = suscripción expirada, eliminar
  if (res.status === 410 || res.status === 404) {
    // No podemos hacer DB aquí sin el cliente, sólo logueamos
    console.warn('Push subscription gone:', sub.endpoint)
  }
}

async function buildVapidHeader({ audience, subject, publicKey, privateKey, now }) {
  const header  = btoa64(JSON.stringify({ alg: 'ES256', typ: 'JWT' }))
  const payload = btoa64(JSON.stringify({ aud: audience, exp: now + 3600, sub: subject }))
  const unsigned = `${header}.${payload}`

  const keyBytes = base64ToBytes(privateKey)
  const key = await crypto.subtle.importKey(
    'pkcs8', keyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )
  const sigBuf = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsigned)
  )
  const sig = btoa64(sigBuf)
  const token = `${unsigned}.${sig}`
  return `vapid t=${token},k=${publicKey}`
}

async function encryptWebPush({ payloadBytes, p256dh, auth }) {
  // Generar par de claves efímeras
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const ephPub = await crypto.subtle.exportKey('raw', eph.publicKey)

  // Importar clave pública del cliente
  const clientPub = await crypto.subtle.importKey('raw', base64ToBytes(p256dh), { name: 'ECDH', namedCurve: 'P-256' }, false, [])

  // ECDH
  const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPub }, eph.privateKey, 256)

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // HKDF para derivar clave AES y nonce
  const authBytes = base64ToBytes(auth)
  const prk = await hkdf(authBytes, sharedBits, 'Content-Encoding: auth\0', 32)
  const cek = await hkdf(salt, prk, buildInfo('aesgcm', new Uint8Array(ephPub), new Uint8Array(base64ToBytes(p256dh))), 16)
  const nonce = await hkdf(salt, prk, buildInfo('nonce', new Uint8Array(ephPub), new Uint8Array(base64ToBytes(p256dh))), 12)

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, payloadBytes)

  // Construir payload aes128gcm (RFC 8291)
  const rs = 4096
  const header = new Uint8Array(16 + 4 + 1 + ephPub.byteLength)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, rs, false)
  header[20] = ephPub.byteLength
  header.set(new Uint8Array(ephPub), 21)

  const result = new Uint8Array(header.byteLength + encrypted.byteLength)
  result.set(header, 0)
  result.set(new Uint8Array(encrypted), header.byteLength)
  return result
}

async function hkdf(salt, ikm, info, len) {
  const saltKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const prk = await crypto.subtle.sign('HMAC', saltKey, ikm instanceof ArrayBuffer ? ikm : ikm.buffer)
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const infoBytes = typeof info === 'string' ? new TextEncoder().encode(info) : info
  const t = await crypto.subtle.sign('HMAC', prkKey, concat(infoBytes, new Uint8Array([1])))
  return new Uint8Array(t).slice(0, len)
}

function buildInfo(type, clientPub, serverPub) {
  const enc = new TextEncoder()
  const typeBytes = enc.encode(`Content-Encoding: ${type}\0P-256\0`)
  const buf = new Uint8Array(typeBytes.length + 2 + clientPub.length + 2 + serverPub.length)
  let off = 0
  buf.set(typeBytes, off); off += typeBytes.length
  new DataView(buf.buffer).setUint16(off, clientPub.length, false); off += 2
  buf.set(clientPub, off); off += clientPub.length
  new DataView(buf.buffer).setUint16(off, serverPub.length, false); off += 2
  buf.set(serverPub, off)
  return buf
}

function concat(...arrays) {
  const total = arrays.reduce((a, b) => a + b.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const arr of arrays) { out.set(arr, off); off += arr.length }
  return out
}

function base64ToBytes(b64) {
  const s = b64.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(s.padEnd(s.length + (4 - s.length % 4) % 4, '='))
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0))).buffer
}

function btoa64(data) {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : (typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
