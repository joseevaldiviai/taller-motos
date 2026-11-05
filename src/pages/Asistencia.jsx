import { useState, useEffect, useCallback } from 'react'
import { Clock, UserCheck, UserX, Calendar, RefreshCw, Shield } from 'lucide-react'
import { api } from '../lib/apiClient'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const s = {
  shell:      { padding:'24px 20px', maxWidth:1100, margin:'0 auto' },
  header:     { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 },
  title:      { fontSize:22, fontWeight:'bold', color:'var(--text-strong)' },
  sub:        { fontSize:12, color:'var(--text-muted)', marginTop:3 },
  filterCard: { background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:20, display:'flex', gap:14, alignItems:'flex-end', flexWrap:'wrap' },
  card:       { background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' },
  tableHead:  { display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1.2fr 100px', padding:'10px 16px', fontSize:11, fontWeight:700, letterSpacing:'.8px', textTransform:'uppercase', color:'var(--text-muted)', borderBottom:'1px solid var(--border)', background:'var(--bg)' },
  tableRow:   { display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1.2fr 100px', padding:'13px 16px', alignItems:'center', borderBottom:'1px solid var(--divider)', fontSize:13 },
  badge:      (c) => ({ display:'inline-block', padding:'3px 10px', borderRadius:9999, fontSize:11, fontWeight:700, background:`${c}22`, color:c }),
  nameCell:   { display:'flex', alignItems:'center' },
  avatar:     (c) => ({ width:32, height:32, borderRadius:'50%', background:c, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:'bold', color:'var(--accent-contrast)', marginRight:8, flexShrink:0 }),
  input:      { background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:13 },
  label:      { display:'block', fontSize:11, fontWeight:600, color:'var(--text-muted)', marginBottom:4, letterSpacing:'.4px', textTransform:'uppercase' },
  btnPrimary: { display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:13, fontWeight:600, cursor:'pointer' },
}

const initials = (n) => (n||'?').split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase()

function formatDuration(ingreso, salida, activo) {
  const start = new Date(ingreso).getTime()
  const end = activo ? Date.now() : (salida ? new Date(salida).getTime() : Date.now())
  const diffMs = Math.max(0, end - start)
  const hrs = Math.floor(diffMs / 3600000)
  const mins = Math.floor((diffMs % 3600000) / 60000)
  const secs = Math.floor((diffMs % 60000) / 1000)
  return `${hrs}h ${mins}m ${secs}s`
}

export default function Asistencia() {
  const { token, esAdmin } = useAuthStore()
  const [asistencias, setAsistencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState(new Date().toISOString().slice(0, 8) + '01') // inicio de mes
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10))
  const [, setTick] = useState(0)

  // Timer para actualizar en tiempo real las horas activas
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await api.listarAsistencia({ token, desde, hasta })
    if (res?.ok) setAsistencias(res.data || [])
    setLoading(false)
  }, [token, desde, hasta])

  useEffect(() => { load() }, [load])

  if (!esAdmin()) {
    return (
      <div style={{padding:60, textAlign:'center'}}>
        <Shield size={48} style={{margin:'0 auto 16px', color:'var(--danger)', opacity:.7}}/>
        <div style={{fontSize:18, fontWeight:'bold', color:'var(--text-strong)'}}>Acceso restringido</div>
        <div style={{fontSize:13, color:'var(--text-muted)', marginTop:6}}>Solo los administradores pueden ver el registro de asistencia.</div>
      </div>
    )
  }

  return (
    <div style={s.shell}>
      <div style={s.header}>
        <div>
          <div style={s.title}>⏱️ Control de Asistencia y Horas Activas</div>
          <div style={s.sub}>Registro de ingresos, salidas y tiempo activo del personal</div>
        </div>
        <button style={s.btnPrimary} onClick={load} disabled={loading}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
      </div>

      <div style={s.filterCard}>
        <div>
          <label style={s.label}>Desde</label>
          <input type="date" style={s.input} value={desde} onChange={e=>setDesde(e.target.value)} />
        </div>
        <div>
          <label style={s.label}>Hasta</label>
          <input type="date" style={s.input} value={hasta} onChange={e=>setHasta(e.target.value)} />
        </div>
      </div>

      <div style={s.card}>
        <div style={s.tableHead}>
          <span>Personal</span>
          <span>Rol</span>
          <span>Ingreso</span>
          <span>Salida</span>
          <span>Tiempo Activo</span>
          <span>Estado</span>
        </div>
        {loading
          ? <div style={{padding:40, textAlign:'center', color:'var(--text-muted)'}}>Cargando…</div>
          : asistencias.length === 0
            ? <div style={{padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13}}>Sin registros de asistencia en este período</div>
            : asistencias.map(a => {
                const u = a.usuario || {}
                return (
                  <div key={a.id} style={s.tableRow}>
                    <div style={s.nameCell}>
                      <div style={s.avatar(u.rol==='ADMIN'?'#3b82f6':'#f59e0b')}>{initials(u.nombre)}</div>
                      <div>
                        <div style={{fontWeight:600, color:'var(--text-strong)'}}>{u.nombre || 'Usuario'}</div>
                        <div style={{fontSize:11, color:'var(--text-muted)'}}>@{u.username || '—'}</div>
                      </div>
                    </div>
                    <div><span style={s.badge(u.rol==='ADMIN'?'#3b82f6':'#f59e0b')}>{u.rol || 'MECANICO'}</span></div>
                    <div style={{fontSize:12, color:'var(--text-soft)'}}>{new Date(a.ingreso).toLocaleString('es-BO')}</div>
                    <div style={{fontSize:12, color:'var(--text-soft)'}}>{a.salida ? new Date(a.salida).toLocaleString('es-BO') : '—'}</div>
                    <div style={{fontSize:13, fontWeight:600, color:'var(--accent)', fontFamily:'monospace'}}>
                      {formatDuration(a.ingreso, a.salida, a.activo)}
                    </div>
                    <div>
                      {a.activo
                        ? <span style={s.badge('#10b981')}><UserCheck size={11}/> Activo</span>
                        : <span style={s.badge('#6b7280')}><UserX size={11}/> Cerrado</span>
                      }
                    </div>
                  </div>
                )
              })
        }
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
