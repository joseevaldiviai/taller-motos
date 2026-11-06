import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Phone, Wrench, Calendar, Plus, Trash2, Pencil, ChevronRight, Clock, FileText, Package, CheckCircle, X } from 'lucide-react'
import { api } from '../lib/apiClient'
import { exportPDFCardDetalle } from '../lib/exportLib'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const ESTADOS = [
  { key:'NUEVO',      label:'Nuevo',      color:'var(--estado-nuevo)',      next:['EN_CURSO'] },
  { key:'EN_CURSO',   label:'En Curso',   color:'var(--estado-en-curso)',   next:['PAUSADO','TERMINADO'] },
  { key:'PAUSADO',    label:'Pausado',    color:'var(--estado-pausado)',    next:['EN_CURSO'] },
  { key:'TERMINADO',  label:'Terminado',  color:'var(--estado-terminado)',  next:['PRUEBAS'] },
  { key:'PRUEBAS',    label:'Pruebas',    color:'var(--estado-pruebas)',    next:['EN_CURSO','FINALIZADO'] },
  { key:'FINALIZADO', label:'Finalizado', color:'var(--estado-finalizado)', next:[] },
]

const SERVICIOS = [
  { value:'CAMBIO_ACEITE', label:'Cambio de aceite' },
  { value:'REPARACION_MOTOR', label:'Reparación de motor' },
  { value:'AJUSTE_VALVULAS', label:'Ajuste de válvulas' },
  { value:'LIMPIEZA_CARBURADOR', label:'Limpieza de carburador' },
  { value:'LIMPIEZA_INYECTORES', label:'Limpieza de inyectores' },
  { value:'CAMBIO_KIT_TRANSMISION', label:'Cambio de kit de transmisión' },
  { value:'CAMBIO_PASTILLAS', label:'Cambio de pastillas/zapatas' },
  { value:'PURGA_FRENOS', label:'Purga de frenos' },
  { value:'REPARACION_SUSPENSION', label:'Reparación de suspensión' },
  { value:'REPARACION_ELECTRICA', label:'Reparación eléctrica' },
  { value:'CAMBIO_BATERIA', label:'Cambio de batería' },
  { value:'ESCANEO_COMPUTARIZADO', label:'Escaneo computarizado' },
  { value:'LIMPIEZA_SISTEMA_INYECCION', label:'Limpieza de sistema de inyección' },
  { value:'CAMBIO_LLANTAS', label:'Cambio de llantas' },
  { value:'MANTENIMIENTO_BASICO', label:'Mantenimiento básico' },
  { value:'MANTENIMIENTO_COMPLETO', label:'Mantenimiento completo' },
  { value:'MANTENIMIENTO_DETALLADO', label:'Mantenimiento detallado' },
  { value:'RESTAURACION', label:'Restauración' },
]

const s = {
  shell:      { padding:'24px 20px', maxWidth:960, margin:'0 auto' },
  back:       { display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'var(--text-muted)', fontSize:13, cursor:'pointer', marginBottom:20, padding:0 },
  card:       { background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:22, marginBottom:14 },
  sectionTtl: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  sLabel:     { display:'flex', alignItems:'center', gap:7, fontSize:12, fontWeight:700, letterSpacing:'.5px', textTransform:'uppercase', color:'var(--text-muted)' },
  badge:      (c) => ({ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:9999, fontSize:12, fontWeight:700, background:`${c}22`, color:c, border:`1px solid ${c}44` }),
  metaRow:    { display:'flex', alignItems:'center', gap:7, fontSize:13, color:'var(--text-soft)', marginBottom:6 },
  label:      { display:'block', fontSize:11, fontWeight:600, color:'var(--text-muted)', marginBottom:5, letterSpacing:'.4px', textTransform:'uppercase' },
  input:      { width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', color:'var(--text)', fontSize:13, marginBottom:12 },
  select:     { width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', color:'var(--text)', fontSize:13, marginBottom:12 },
  btnPrimary: { padding:'8px 16px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:13, fontWeight:600, cursor:'pointer' },
  btnGhost:   { display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:7, border:'1px solid var(--border)', background:'transparent', color:'var(--text-soft)', fontSize:12, cursor:'pointer' },
  btnEstado:  (c) => ({ padding:'7px 13px', borderRadius:7, border:`1px solid ${c}`, background:`${c}18`, color:c, fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }),
  btnDanger:  { padding:'5px 9px', borderRadius:6, border:'1px solid var(--danger)', background:'rgba(239,68,68,.08)', color:'var(--danger)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center' },
  btnEdit:    { padding:'5px 9px', borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center' },
  totalBox:   { background:'var(--accent-weak)', border:'1px solid var(--accent)', borderRadius:10, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  th:         { padding:'8px 12px', fontSize:10, fontWeight:700, letterSpacing:'.5px', textTransform:'uppercase', color:'var(--text-muted)', borderBottom:'1px solid var(--border)', background:'var(--bg)', textAlign:'left' },
  td:         { padding:'10px 12px', borderBottom:'1px solid var(--divider)', color:'var(--text)', verticalAlign:'middle' },
  tdNum:      { padding:'10px 12px', borderBottom:'1px solid var(--divider)', color:'var(--accent)', fontWeight:600, textAlign:'right', verticalAlign:'middle' },
  logItem:    { display:'flex', gap:10, padding:'9px 0', borderBottom:'1px solid var(--divider)' },
  logDot:     (c) => ({ width:9, height:9, borderRadius:'50%', background:c||'var(--text-muted)', marginTop:4, flexShrink:0 }),
  overlay:    { position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:16 },
  modal:      { width:'100%', maxWidth:440, background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:26, maxHeight:'90vh', overflowY:'auto' },
  modalTitle: { fontSize:15, fontWeight:'bold', color:'var(--text-strong)', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' },
  btnRow:     { display:'flex', gap:8, marginTop:8 },
  btnCancel:  { flex:1, padding:'9px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-soft)', fontSize:13, cursor:'pointer' },
  btnSave:    { flex:1, padding:'9px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:13, fontWeight:600, cursor:'pointer' },
  // Multi-select chips
  chipWrap:   { display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 },
  chip:       (sel) => ({ padding:'6px 12px', borderRadius:8, border:`1px solid ${sel?'var(--accent)':'var(--border)'}`, background: sel?'var(--accent-weak)':'transparent', color: sel?'var(--accent)':'var(--text-soft)', fontSize:12, fontWeight: sel?600:400, cursor:'pointer', transition:'all .15s' }),
}

function calcTotal(card) {
  const serv = (card.servicios_realizados||[]).reduce((a,s)=>a+(s.precio||0),0)
  const remp = (card.reemplazos||[]).reduce((a,r)=>a+r.precio*r.cantidad,0)
  const ext  = (card.trabajos_externos||[]).reduce((a,t)=>a+t.precio_final,0)
  const costo= (card.reemplazos||[]).reduce((a,r)=>a+(r.costo||0)*r.cantidad,0) +
      (card.trabajos_externos||[]).reduce((a,t)=>a+(t.costo||0),0)
  return { serv, remp, ext, total:serv+remp+ext, costo, neto:serv+remp+ext-costo }
}

// ── Multi-select tipo servicio ────────────────────────────────
function TipoServicioSelect({ value, onChange }) {
  const selected = Array.isArray(value) ? value : (value ? [value] : [])
  const toggle = (v) => {
    if (selected.includes(v)) onChange(selected.filter(x=>x!==v))
    else onChange([...selected, v])
  }
  return (
      <div style={s.chipWrap}>
        {SERVICIOS.map(sv => (
            <button key={sv.value} type="button"
                    style={s.chip(selected.includes(sv.value))}
                    onClick={() => toggle(sv.value)}>
              {selected.includes(sv.value) && '✓ '}{sv.label}
            </button>
        ))}
      </div>
  )
}

// ── Modal Servicio Realizado ──────────────────────────────────
function ModalServicio({ token, cardId, servicio, onClose, onSaved }) {
  const isEdit = !!servicio
  const [form, setForm] = useState({
    nombre:      servicio?.nombre || '',
    descripcion: servicio?.descripcion || '',
    precio:      servicio?.precio || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombre || form.precio === '') { toast.error('Nombre y precio requeridos'); return }
    setSaving(true)
    const data = { card_id: cardId, nombre: form.nombre, descripcion: form.descripcion||null, precio: parseFloat(form.precio) }
    const res = isEdit
        ? await api.actualizarServicioRealizado({ token, id: servicio.id, data })
        : await api.crearServicioRealizado({ token, data })
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success(isEdit ? 'Servicio actualizado' : 'Servicio agregado')
    onSaved()
  }

  return (
      <div style={s.overlay} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
        <div style={s.modal}>
          <div style={s.modalTitle}>
            {isEdit ? 'Editar Servicio' : 'Agregar Servicio Realizado'}
            <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}><X size={18}/></button>
          </div>
          <form onSubmit={handleSave}>
            <label style={s.label}>Nombre del servicio *</label>
            <input style={s.input} value={form.nombre}
                   onChange={e=>setForm(f=>({...f,nombre:e.target.value}))}
                   placeholder="Ej: Cambio de aceite, Ajuste de frenos..." required />
            <label style={s.label}>Descripción (opcional)</label>
            <textarea style={{...s.input,resize:'vertical',minHeight:60}} value={form.descripcion}
                      onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))}
                      placeholder="Detalles del trabajo..." />
            <label style={s.label}>Precio cobrado al cliente (Bs.) *</label>
            <input style={s.input} type="number" min="0" step="0.01" value={form.precio}
                   onChange={e=>setForm(f=>({...f,precio:e.target.value}))} placeholder="0.00" required />
            <div style={s.btnRow}>
              <button type="button" style={s.btnCancel} onClick={onClose}>Cancelar</button>
              <button type="submit" style={{...s.btnSave,opacity:saving?.6:1}} disabled={saving}>
                {saving?'Guardando…':isEdit?'Actualizar':'Agregar'}
              </button>
            </div>
          </form>
        </div>
      </div>
  )
}

// ── Modal Reemplazo con costo ─────────────────────────────────
function ModalReemplazo({ token, cardId, insumos, reemplazo, onClose, onSaved }) {
  const isEdit = !!reemplazo
  const isAdmin = useAuthStore.getState().esAdmin()
  const [form, setForm] = useState({
    insumo_id: reemplazo?.insumo_id || '',
    nombre: reemplazo?.nombre || '',
    precio: reemplazo?.precio !== undefined ? reemplazo.precio : '',
    costo: reemplazo?.costo !== undefined ? reemplazo.costo : '',
    cantidad: reemplazo?.cantidad !== undefined ? reemplazo.cantidad : 1,
  })
  const [saving, setSaving] = useState(false)

  const handleInsumo = (id) => {
    const ins = insumos.find(i=>String(i.id)===String(id))
    if (ins) setForm(f=>({...f, insumo_id:id, nombre:ins.nombre, precio:ins.precio}))
    else setForm(f=>({...f, insumo_id:''}))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombre || form.precio==='') { toast.error('Nombre y precio requeridos'); return }
    setSaving(true)
    const data = {
      card_id: cardId, insumo_id: form.insumo_id||null,
      nombre: form.nombre, precio: parseFloat(form.precio),
      costo: isAdmin ? (parseFloat(form.costo)||0) : 0,
      cantidad: parseFloat(form.cantidad)||1,
    }
    const res = isEdit
      ? await api.actualizarReemplazo({ token, id: reemplazo.id, data })
      : await api.crearReemplazo({ token, data })
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success(isEdit ? 'Reemplazo actualizado' : 'Reemplazo agregado')
    onSaved()
  }

  const margen = isAdmin && form.precio && form.costo
      ? ((parseFloat(form.precio) - parseFloat(form.costo)) / parseFloat(form.precio) * 100).toFixed(0)
      : null

  return (
      <div style={s.overlay} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
        <div style={s.modal}>
          <div style={s.modalTitle}>
            {isEdit ? 'Editar Reemplazo' : 'Agregar Reemplazo / Repuesto'}
            <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}><X size={18}/></button>
          </div>
          <form onSubmit={handleSave}>
            {!isEdit && (
              <>
                <label style={s.label}>Desde catálogo de inventario</label>
                <select style={s.select} value={form.insumo_id} onChange={e=>handleInsumo(e.target.value)}>
                  <option value="">— Seleccionar del inventario —</option>
                  {insumos.map(i=><option key={i.id} value={i.id}>{i.nombre} — Bs. {i.precio}</option>)}
                </select>
              </>
            )}
            <label style={s.label}>Nombre del repuesto *</label>
            <input style={s.input} value={form.nombre}
                   onChange={e=>setForm(f=>({...f,nombre:e.target.value}))}
                   placeholder="Ej: Filtro de aire, Bujía..." required />
            <div style={{display:'grid',gridTemplateColumns:isAdmin?'1fr 1fr':'1fr',gap:10}}>
              <div>
                <label style={s.label}>Precio al cliente (Bs.) *</label>
                <input style={s.input} type="number" min="0" step="0.01" value={form.precio}
                       onChange={e=>setForm(f=>({...f,precio:e.target.value}))} placeholder="0.00" required />
              </div>
              {isAdmin && (
                <div>
                  <label style={s.label}>Costo real (Bs.)</label>
                  <input style={s.input} type="number" min="0" step="0.01" value={form.costo}
                         onChange={e=>setForm(f=>({...f,costo:e.target.value}))} placeholder="0.00" />
                </div>
              )}
            </div>
            {isAdmin && margen !== null && (
                <div style={{fontSize:12,color:parseFloat(margen)>=20?'var(--success)':'var(--warning)',marginTop:-8,marginBottom:12}}>
                  Margen: {margen}%
                </div>
            )}
            <label style={s.label}>Cantidad</label>
            <input style={s.input} type="number" min="0.01" step="0.01" value={form.cantidad}
                   onChange={e=>setForm(f=>({...f,cantidad:e.target.value}))} />
            <div style={s.btnRow}>
              <button type="button" style={s.btnCancel} onClick={onClose}>Cancelar</button>
              <button type="submit" style={{...s.btnSave,opacity:saving?.6:1}} disabled={saving}>
                {saving?'Guardando…':isEdit?'Actualizar':'Agregar'}
              </button>
            </div>
          </form>
        </div>
      </div>
  )
}

// ── Modal Trabajo Externo ─────────────────────────────────────
function ModalExterno({ token, cardId, externo, onClose, onSaved }) {
  const isEdit = !!externo
  const isAdmin = useAuthStore.getState().esAdmin()
  const [form, setForm] = useState({
    detalle: externo?.detalle || '',
    precio_final: externo?.precio_final !== undefined ? externo.precio_final : '',
    costo: externo?.costo !== undefined ? externo.costo : '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const data = {
      card_id: cardId, detalle: form.detalle,
      precio_final: parseFloat(form.precio_final),
      costo: isAdmin ? (parseFloat(form.costo)||0) : 0,
    }
    const res = isEdit
      ? await api.actualizarTrabajoExterno({ token, id: externo.id, data })
      : await api.crearTrabajoExterno({ token, data })
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success(isEdit ? 'Trabajo externo actualizado' : 'Trabajo externo agregado')
    onSaved()
  }

  return (
      <div style={s.overlay} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
        <div style={s.modal}>
          <div style={s.modalTitle}>
            {isEdit ? 'Editar Trabajo Externo' : 'Agregar Trabajo Externo'}
            <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}><X size={18}/></button>
          </div>
          <form onSubmit={handleSave}>
            <label style={s.label}>Detalle *</label>
            <textarea style={{...s.input,resize:'vertical',minHeight:70}} value={form.detalle}
                      onChange={e=>setForm(f=>({...f,detalle:e.target.value}))}
                      placeholder="Descripción del trabajo externo..." required />
            <div style={{display:'grid',gridTemplateColumns:isAdmin?'1fr 1fr':'1fr',gap:10}}>
              <div>
                <label style={s.label}>Precio al cliente (Bs.) *</label>
                <input style={s.input} type="number" min="0" step="0.01" value={form.precio_final}
                       onChange={e=>setForm(f=>({...f,precio_final:e.target.value}))} placeholder="0.00" required />
              </div>
              {isAdmin && (
                <div>
                  <label style={s.label}>Costo real (Bs.)</label>
                  <input style={s.input} type="number" min="0" step="0.01" value={form.costo}
                         onChange={e=>setForm(f=>({...f,costo:e.target.value}))} placeholder="0.00" />
                </div>
              )}
            </div>
            <div style={s.btnRow}>
              <button type="button" style={s.btnCancel} onClick={onClose}>Cancelar</button>
              <button type="submit" style={{...s.btnSave,opacity:saving?.6:1}} disabled={saving}>
                {saving?'Guardando…':isEdit?'Actualizar':'Agregar'}
              </button>
            </div>
          </form>
        </div>
      </div>
  )
}

// ── Modal Asignar Mecánico ────────────────────────────────────
function ModalMecanico({ token, cardId, mecanicos, mecanicoActual, onClose, onSaved }) {
  const [mecId, setMecId] = useState(mecanicoActual||'')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!mecId) { toast.error('Selecciona un mecánico'); return }
    setSaving(true)
    const res = await api.cambiarEstadoCard({ token, id:cardId, estado:'EN_CURSO', mecanico_id:mecId, nota:'Mecánico asignado' })
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success('Mecánico asignado — En Curso')
    onSaved()
  }

  return (
      <div style={s.overlay} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
        <div style={s.modal}>
          <div style={s.modalTitle}>
            Asignar Mecánico
            <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}><X size={18}/></button>
          </div>
          <form onSubmit={handleSave}>
            <label style={s.label}>Mecánico *</label>
            <select style={s.select} value={mecId} onChange={e=>setMecId(e.target.value)} required>
              <option value="">— Seleccionar —</option>
              {mecanicos.map(m=><option key={m.id} value={m.id}>{m.nombre} ({m.tipo_sueldo})</option>)}
            </select>
            <div style={s.btnRow}>
              <button type="button" style={s.btnCancel} onClick={onClose}>Cancelar</button>
              <button type="submit" style={{...s.btnSave,opacity:saving?.6:1}} disabled={saving}>
                {saving?'Asignando…':'Asignar y poner En Curso'}
              </button>
            </div>
          </form>
        </div>
      </div>
  )
}

// ── Modal Registrar Pago ───────────────────────────────────────
function ModalPago({ token, cardId, pagadoActual, metodoActual, onClose, onSaved }) {
  const [pagado, setPagado] = useState(pagadoActual)
  const [metodo, setMetodo] = useState(metodoActual || 'EFECTIVO')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await api.actualizarCard({ token, id: cardId, data: {
      pagado,
      metodo_pago: pagado ? metodo : null,
    }})
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error || 'Error'); return }
    toast.success(pagado ? 'Pago registrado exitosamente' : 'Pago marcado como pendiente')
    onSaved()
  }

  return (
    <div style={s.overlay} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={s.modal}>
        <div style={s.modalTitle}>
          Gestión de Pago
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}><X size={18}/></button>
        </div>
        <form onSubmit={handleSave}>
          <label style={s.label}>Estado de Pago</label>
          <div style={{display:'flex',gap:10,marginBottom:14}}>
            <button type="button" style={{flex:1,padding:'10px',borderRadius:8,border:`(pagado?1px solid var(--success):1px solid var(--border))`,background:pagado?'rgba(16,185,129,.15)':'transparent',color:pagado?'var(--success)':'var(--text-soft)',fontWeight:pagado?700:400,cursor:'pointer'}}
              onClick={()=>setPagado(true)}>
              ✓ Pagado
            </button>
            <button type="button" style={{flex:1,padding:'10px',borderRadius:8,border:`(!pagado?1px solid var(--danger):1px solid var(--border))`,background:!pagado?'rgba(239,68,68,.15)':'transparent',color:!pagado?'var(--danger)':'var(--text-soft)',fontWeight:!pagado?700:400,cursor:'pointer'}}
              onClick={()=>setPagado(false)}>
              ✕ Pendiente
            </button>
          </div>

          {pagado && (
            <>
              <label style={s.label}>Método de Pago</label>
              <select style={s.select} value={metodo} onChange={e=>setMetodo(e.target.value)}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="QR">QR</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="OTRO">Otro</option>
              </select>
            </>
          )}

          <div style={s.btnRow}>
            <button type="button" style={s.btnCancel} onClick={onClose}>Cancelar</button>
            <button type="submit" style={{...s.btnSave,opacity:saving?.6:1}} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const VEHICULO_LABEL = { MOTO: 'Moto', TRIMOTO: 'Trimoto', CUADRATRACK: 'Cuadratrack' }

function ModalMoto({ token, card, onClose, onSaved }) {
  const [form, setForm] = useState({
    moto_marca: card.moto_marca || '',
    moto_modelo: card.moto_modelo || '',
    moto_color: card.moto_color || '',
    tipo_vehiculo: card.tipo_vehiculo || 'MOTO',
    cliente_nombre: card.cliente_nombre || '',
    cliente_telefono: card.cliente_telefono || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await api.actualizarCard({ token, id: card.id, data: form })
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error || 'Error'); return }
    toast.success('Datos actualizados')
    onSaved()
  }

  return (
    <div style={s.overlay} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={s.modal}>
        <div style={s.modalTitle}>
          Editar Datos del Vehículo y Cliente
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}><X size={18}/></button>
        </div>
        <form onSubmit={handleSave}>
          <label style={s.label}>Nombre del cliente *</label>
          <input style={s.input} value={form.cliente_nombre} onChange={e=>setForm(f=>({...f,cliente_nombre:e.target.value}))} required />

          <label style={s.label}>Tipo de Vehículo</label>
          <select style={s.select} value={form.tipo_vehiculo} onChange={e=>setForm(f=>({...f,tipo_vehiculo:e.target.value}))}>
            <option value="MOTO">🏍️ Moto</option>
            <option value="TRIMOTO">🛺 Trimoto</option>
            <option value="CUADRATRACK">🚜 Cuadratrack</option>
          </select>

          <label style={s.label}>Teléfono</label>
          <input style={s.input} value={form.cliente_telefono} onChange={e=>setForm(f=>({...f,cliente_telefono:e.target.value}))} />

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            <div>
              <label style={s.label}>Marca</label>
              <input style={s.input} value={form.moto_marca} onChange={e=>setForm(f=>({...f,moto_marca:e.target.value}))} placeholder="Honda" />
            </div>
            <div>
              <label style={s.label}>Modelo</label>
              <input style={s.input} value={form.moto_modelo} onChange={e=>setForm(f=>({...f,moto_modelo:e.target.value}))} placeholder="XR 150" />
            </div>
            <div>
              <label style={s.label}>Color</label>
              <input style={s.input} value={form.moto_color} onChange={e=>setForm(f=>({...f,moto_color:e.target.value}))} placeholder="Rojo" />
            </div>
          </div>

          <div style={s.btnRow}>
            <button type="button" style={s.btnCancel} onClick={onClose}>Cancelar</button>
            <button type="submit" style={{...s.btnSave,opacity:saving?.6:1}} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TablaVacia({ msg }) {
  return <div style={{padding:'20px 0',textAlign:'center',fontSize:13,color:'var(--text-muted)'}}>{msg}</div>
}

// ── Página principal ──────────────────────────────────────────
export default function CardDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, esAdmin } = useAuthStore()
  const [card, setCard] = useState(null)
  const [insumos, setInsumos] = useState([])
  const [mecanicos, setMecanicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [modalData, setModalData] = useState(null)
  const [saving, setSaving] = useState(false)
  // Edición inline de tipo_servicio
  const [editandoTipo, setEditandoTipo] = useState(false)
  const [tiposSeleccionados, setTiposSeleccionados] = useState([])

  const load = useCallback(async () => {
    const [resCard, resIns, resMec] = await Promise.all([
      api.obtenerCard({ token, id }),
      api.listarInsumos({ token }),
      esAdmin() ? api.listarUsuarios({ token }) : Promise.resolve({ ok:true, data:[] }),
    ])
    if (resCard.ok) {
      setCard(resCard.data)
      const tipos = resCard.data.tipo_servicio
      setTiposSeleccionados(Array.isArray(tipos) ? tipos : (tipos ? [tipos] : []))
    } else {
      toast.error('No encontrado')
      navigate('/tablero')
    }
    if (resIns.ok) setInsumos(resIns.data||[])
    if (resMec.ok) setMecanicos((resMec.data||[]).filter(u=>u.rol==='MECANICO'&&u.activo))
    setLoading(false)
  }, [token, id])

  useEffect(() => { load() }, [load])

  const handleGuardarTipos = async () => {
    if (tiposSeleccionados.length === 0) { toast.error('Selecciona al menos un tipo'); return }
    setSaving(true)
    const res = await api.actualizarCard({ token, id, data:{ tipo_servicio: tiposSeleccionados }})
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success('Tipo de servicio actualizado')
    setEditandoTipo(false)
    load()
  }

  const estadoInfo  = card ? ESTADOS.find(e=>e.key===card.estado) : null
  const isFinalizado = card?.estado === 'FINALIZADO'
  const nextEstados  = estadoInfo?.next || []
  const { serv, remp, ext, total, costo, neto } = card ? calcTotal(card) : { serv:0, remp:0, ext:0, total:0, costo:0, neto:0 }

  const tiposCard = card ? (Array.isArray(card.tipo_servicio) ? card.tipo_servicio : [card.tipo_servicio]) : []
  const tiposLabel = tiposCard.map(t => SERVICIOS.find(s=>s.value===t)?.label || t).join(', ')

  const handleCambiarEstado = async (nuevoEstado) => {
    setSaving(true)
    const res = await api.cambiarEstadoCard({ token, id, estado: nuevoEstado })
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success(`→ ${ESTADOS.find(e=>e.key===nuevoEstado)?.label}`)
    load()
  }

  const handleEliminarServicio = async (sid) => {
    if (!confirm('¿Eliminar?')) return
    const res = await api.eliminarServicioRealizado({ token, id:sid })
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success('Eliminado'); load()
  }

  const handleEliminarReemplazo = async (rid) => {
    if (!confirm('¿Eliminar?')) return
    const res = await api.eliminarReemplazo({ token, id:rid })
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success('Eliminado'); load()
  }

  const handleEliminarExterno = async (tid) => {
    if (!confirm('¿Eliminar?')) return
    const res = await api.eliminarTrabajoExterno({ token, id:tid })
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success('Eliminado'); load()
  }

  if (loading) return <div style={{padding:60,textAlign:'center',color:'var(--text-muted)'}}>Cargando…</div>
  if (!card) return null

  return (
      <div style={s.shell}>
        <button style={s.back} onClick={()=>navigate('/tablero')}>
          <ArrowLeft size={14}/> Volver al tablero
        </button>

        {/* ENCABEZADO */}
        <div style={s.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12,marginBottom:14}}>
            <div>
              <div style={{fontSize:20,fontWeight:'bold',color:'var(--text-strong)',marginBottom:6}}>
                {card.cliente_nombre}
                <span style={{fontSize:13,color:'var(--text-muted)',fontWeight:400,marginLeft:10}}>#{card.id}</span>
              </div>
              <span style={s.badge(estadoInfo?.color||'#888')}>{estadoInfo?.label||card.estado}</span>
            </div>
            <div style={{display:'flex',gap:7,flexWrap:'wrap',alignItems:'center'}}>
              {isFinalizado && (
                  <button style={{...s.btnGhost, borderColor:'#ef4444', color:'#ef4444', background:'rgba(239,68,68,.08)', fontWeight:600}} onClick={()=>exportPDFCardDetalle(card)}>
                    <FileText size={13}/> Imprimir Comprobante (PDF)
                  </button>
              )}
              {card.estado==='NUEVO' && esAdmin() && (
                  <button style={s.btnGhost} onClick={()=>setModal('mecanico')}>
                    <User size={13}/> Asignar mecánico
                  </button>
              )}
              {nextEstados.filter(e=>!(e==='EN_CURSO'&&card.estado==='NUEVO')).map(e=>{
                const info = ESTADOS.find(x=>x.key===e)
                return (
                    <button key={e} style={s.btnEstado(info?.color||'#888')}
                            onClick={()=>handleCambiarEstado(e)} disabled={saving}>
                      <ChevronRight size={13}/>{info?.label}
                    </button>
                )
              })}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8,marginBottom:10}}>
            {card.cliente_telefono && <div style={s.metaRow}><Phone size={13} color="var(--accent)"/>{card.cliente_telefono}</div>}
            <div style={s.metaRow}><Calendar size={13} color="var(--accent)"/>{card.fecha}</div>
            {card.mecanico && <div style={s.metaRow}><User size={13} color="var(--accent)"/>{card.mecanico.nombre}</div>}
          </div>

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:12,padding:'8px 12px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--text-strong)'}}>
              <span style={s.badge('#3b82f6')}>{VEHICULO_LABEL[card.tipo_vehiculo] || 'Moto'}</span>
              <span><b>{card.moto_marca || '—'} {card.moto_modelo || ''} {card.moto_color ? `(${card.moto_color})` : ''}</b></span>
            </div>
            {!isFinalizado && (
              <button style={{...s.btnEdit,padding:'3px 8px',fontSize:11}} onClick={()=>setModal('moto')}>
                <Pencil size={11}/> Editar Vehículo / Cliente
              </button>
            )}
          </div>

          {/* Tipo de servicio editable */}
          <div style={{marginBottom:card.notas?12:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <Wrench size={13} color="var(--accent)"/>
              <span style={{fontSize:13,color:'var(--text-soft)'}}>{tiposLabel || 'Sin tipo definido'}</span>
              {!isFinalizado && (
                  <button style={{...s.btnEdit,padding:'3px 8px',fontSize:11}} onClick={()=>setEditandoTipo(v=>!v)}>
                    <Pencil size={11}/> &nbsp;{editandoTipo?'Cancelar':'Editar'}
                  </button>
              )}
            </div>
            {editandoTipo && (
                <div style={{background:'var(--bg)',borderRadius:8,padding:12,border:'1px solid var(--border)'}}>
                  <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8,fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px'}}>Selecciona uno o más tipos</div>
                  <TipoServicioSelect value={tiposSeleccionados} onChange={setTiposSeleccionados}/>
                  <button style={{...s.btnPrimary,fontSize:12,padding:'7px 16px'}} onClick={handleGuardarTipos} disabled={saving}>
                    {saving?'Guardando…':'Guardar tipos'}
                  </button>
                </div>
            )}
          </div>

          {/* Checklist de servicios solicitados vs realizados */}
          {tiposCard.length > 0 && (
              <div style={{marginTop:12,padding:'10px 14px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>Progreso de servicios</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {tiposCard.map(t => {
                    const info = SERVICIOS.find(s=>s.value===t)
                    const realizado = (card.servicios_realizados||[]).some(sv =>
                      sv.nombre?.toLowerCase().includes(info?.label?.toLowerCase() || t.toLowerCase())
                    )
                    return (
                      <div key={t} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:6,background:realizado?'rgba(16,185,129,.1)':'transparent',border:`1px solid ${realizado?'var(--success)':'var(--border)'}`,fontSize:12,color:realizado?'var(--success)':'var(--text-soft)'}}>
                        {realizado ? <CheckCircle size={13}/> : <div style={{width:13,height:13,borderRadius:'50%',border:'1.5px solid var(--border)'}}/>}
                        <span style={{textDecoration:realizado?'line-through':'none',opacity:realizado?.7:1}}>{info?.label||t}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
          )}

          {card.notas && (
              <div style={{marginTop:8,padding:'9px 13px',background:'var(--bg)',borderRadius:8,fontSize:13,color:'var(--text-soft)',borderLeft:'3px solid var(--accent)'}}>
                {card.notas}
              </div>
          )}
        </div>

        {/* ESTADO DE PAGO */}
        <div style={{
          background: card.pagado ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${card.pagado ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 12, padding: '14px 20px', marginBottom: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10
        }}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{fontSize:18}}>{card.pagado ? '✅' : '⚠️'}</div>
            <div>
              <div style={{fontSize:14, fontWeight:'bold', color: card.pagado ? 'var(--success)' : 'var(--danger)'}}>
                {card.pagado ? `PAGADO (${card.metodo_pago || 'EFECTIVO'})` : 'PENDIENTE DE PAGO'}
              </div>
              <div style={{fontSize:12, color:'var(--text-muted)', marginTop:2}}>
                {card.pagado ? 'El cliente ha cancelado el monto total de esta orden.' : 'Esta orden aún no registra pago.'}
              </div>
            </div>
          </div>
          <button style={{
            ...s.btnGhost,
            borderColor: card.pagado ? 'var(--success)' : 'var(--danger)',
            color: card.pagado ? 'var(--success)' : 'var(--danger)',
            background: card.pagado ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            fontWeight: 600
          }} onClick={()=>setModal('pago')}>
            {card.pagado ? 'Modificar pago' : 'Registrar pago'}
          </button>
        </div>

        {/* TOTAL */}
        <div style={{...s.totalBox,marginBottom:14}}>
          <div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:6}}>Desglose</div>
            <div style={{fontSize:12,color:'var(--text-soft)',lineHeight:1.8}}>
              Mano de obra: <b style={{color:'var(--text)'}}>Bs. {serv.toFixed(2)}</b><br/>
              Repuestos: <b style={{color:'var(--text)'}}>Bs. {remp.toFixed(2)}</b>
              &nbsp;·&nbsp; Externos: <b style={{color:'var(--text)'}}>Bs. {ext.toFixed(2)}</b>
              {esAdmin() && (
                <><br/>Costo materiales: <b style={{color:'var(--danger)'}}>Bs. {costo.toFixed(2)}</b></>
              )}
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:2}}>Total cobrado</div>
            <div style={{fontSize:24,fontWeight:'bold',color:'var(--accent)'}}>Bs. {total.toFixed(2)}</div>
            {esAdmin() && <div style={{fontSize:12,color:'var(--success)',marginTop:4}}>Neto: Bs. {neto.toFixed(2)}</div>}
          </div>
        </div>

        {/* SERVICIOS REALIZADOS */}
        <div style={s.card}>
          <div style={s.sectionTtl}>
            <div style={s.sLabel}><CheckCircle size={14}/> Servicios Realizados</div>
            {!isFinalizado && (
                <button style={s.btnGhost} onClick={()=>setModal('servicio')}><Plus size={13}/> Agregar</button>
            )}
          </div>
          {!(card.servicios_realizados?.length)
              ? <TablaVacia msg="Sin servicios registrados"/>
              : <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>
                    <th style={s.th}>Servicio</th>
                    <th style={s.th}>Descripción</th>
                    <th style={{...s.th,textAlign:'right'}}>Precio</th>
                    {!isFinalizado && <th style={s.th}></th>}
                  </tr></thead>
                  <tbody>
                  {card.servicios_realizados.map(sv=>(
                      <tr key={sv.id}>
                        <td style={{...s.td,fontWeight:600,color:'var(--text-strong)'}}>{sv.nombre}</td>
                        <td style={{...s.td,color:'var(--text-soft)',fontSize:12}}>{sv.descripcion||'—'}</td>
                        <td style={s.tdNum}>Bs. {parseFloat(sv.precio).toFixed(2)}</td>
                        {!isFinalizado && (
                            <td style={{...s.td,textAlign:'right'}}>
                              <div style={{display:'flex',gap:5,justifyContent:'flex-end'}}>
                                <button style={s.btnEdit} onClick={()=>{setModalData(sv);setModal('servicio-edit')}}>
                                  <Pencil size={12}/>
                                </button>
                                <button style={s.btnDanger} onClick={()=>handleEliminarServicio(sv.id)}>
                                  <Trash2 size={12}/>
                                </button>
                              </div>
                            </td>
                        )}
                      </tr>
                  ))}
                  <tr>
                    <td colSpan={2} style={{...s.td,fontWeight:700,color:'var(--text-muted)',fontSize:11,textAlign:'right'}}>SUBTOTAL</td>
                    <td style={{...s.tdNum,fontWeight:700}}>Bs. {serv.toFixed(2)}</td>
                    {!isFinalizado && <td style={s.td}/>}
                  </tr>
                  </tbody>
                </table>
              </div>
          }
        </div>

        {/* REEMPLAZOS */}
        <div style={s.card}>
          <div style={s.sectionTtl}>
            <div style={s.sLabel}><Package size={14}/> Reemplazos / Repuestos</div>
            {!isFinalizado && (
                <button style={s.btnGhost} onClick={()=>setModal('reemplazo')}><Plus size={13}/> Agregar</button>
            )}
          </div>
          {!(card.reemplazos?.length)
              ? <TablaVacia msg="Sin reemplazos registrados"/>
              : <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>
                    <th style={s.th}>Repuesto</th>
                    <th style={{...s.th,textAlign:'right'}}>Precio</th>
                    {esAdmin() && <th style={{...s.th,textAlign:'right'}}>Costo</th>}
                    <th style={{...s.th,textAlign:'right'}}>Cant.</th>
                    <th style={{...s.th,textAlign:'right'}}>Subtotal</th>
                    {esAdmin() && <th style={{...s.th,textAlign:'right'}}>Margen</th>}
                    {!isFinalizado && <th style={s.th}></th>}
                  </tr></thead>
                  <tbody>
                  {card.reemplazos.map(r=>{
                    const pTotal = (r.precio||0)*r.cantidad
                    const cTotal = (r.costo||0)*r.cantidad
                    const margen = pTotal > 0 ? ((pTotal - cTotal) / pTotal * 100).toFixed(0) : 0
                    const margenColor = margen >= 40 ? 'var(--success)' : margen >= 20 ? 'var(--warning)' : 'var(--danger)'
                    return (
                      <tr key={r.id}>
                        <td style={{...s.td,fontWeight:500}}>{r.nombre}</td>
                        <td style={{...s.td,textAlign:'right',color:'var(--text-soft)'}}>Bs. {r.precio}</td>
                        {esAdmin() && <td style={{...s.td,textAlign:'right',color:'var(--danger)',fontSize:12}}>Bs. {r.costo||0}</td>}
                        <td style={{...s.td,textAlign:'right',color:'var(--text-soft)'}}>x{r.cantidad}</td>
                        <td style={s.tdNum}>Bs. {pTotal.toFixed(2)}</td>
                        {esAdmin() && <td style={{...s.td,textAlign:'right'}}><span style={s.badge(margenColor)}>{margen}%</span></td>}
                        {!isFinalizado && (
                            <td style={{...s.td,textAlign:'right'}}>
                              <div style={{display:'flex',gap:5,justifyContent:'flex-end'}}>
                                <button style={s.btnEdit} onClick={()=>{setModalData(r);setModal('reemplazo-edit')}}>
                                  <Pencil size={12}/>
                                </button>
                                <button style={s.btnDanger} onClick={()=>handleEliminarReemplazo(r.id)}>
                                  <Trash2 size={12}/>
                                </button>
                              </div>
                            </td>
                        )}
                      </tr>
                    )
                  })}
                  <tr>
                    <td colSpan={esAdmin() ? 4 : 2} style={{...s.td,fontWeight:700,color:'var(--text-muted)',fontSize:11,textAlign:'right'}}>SUBTOTAL</td>
                    <td style={{...s.tdNum,fontWeight:700}}>Bs. {remp.toFixed(2)}</td>
                    {esAdmin() && (
                      <td style={{...s.td,textAlign:'right'}}>{(() => {
                        const pT = remp
                        const cT = (card.reemplazos||[]).reduce((a,r)=>a+(r.costo||0)*r.cantidad,0)
                        const m = pT > 0 ? ((pT - cT) / pT * 100).toFixed(0) : 0
                        const mc = m >= 40 ? 'var(--success)' : m >= 20 ? 'var(--warning)' : 'var(--danger)'
                        return <span style={s.badge(mc)}>{m}%</span>
                      })()}</td>
                    )}
                    {!isFinalizado && <td style={s.td}/>}
                  </tr>
                  </tbody>
                </table>
              </div>
          }
        </div>

        {/* TRABAJOS EXTERNOS */}
        <div style={s.card}>
          <div style={s.sectionTtl}>
            <div style={s.sLabel}><FileText size={14}/> Trabajos Externos</div>
            {!isFinalizado && (
                <button style={s.btnGhost} onClick={()=>setModal('externo')}><Plus size={13}/> Agregar</button>
            )}
          </div>
          {!(card.trabajos_externos?.length)
              ? <TablaVacia msg="Sin trabajos externos"/>
              : <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>
                    <th style={s.th}>Detalle</th>
                    <th style={{...s.th,textAlign:'right'}}>Precio</th>
                    {esAdmin() && <th style={{...s.th,textAlign:'right'}}>Costo</th>}
                    {esAdmin() && <th style={{...s.th,textAlign:'right'}}>Margen</th>}
                    {!isFinalizado && <th style={s.th}></th>}
                  </tr></thead>
                  <tbody>
                  {card.trabajos_externos.map(t=>{
                    const margen = t.precio_final-(t.costo||0)
                    return (
                        <tr key={t.id}>
                          <td style={s.td}>{t.detalle}</td>
                          <td style={s.tdNum}>Bs. {t.precio_final}</td>
                          {esAdmin() && <td style={{...s.td,textAlign:'right',color:'var(--danger)',fontSize:12}}>Bs. {t.costo||0}</td>}
                          {esAdmin() && (
                            <td style={{...s.td,textAlign:'right',fontWeight:600,color:margen>=0?'var(--success)':'var(--danger)'}}>
                              Bs. {margen.toFixed(2)}
                            </td>
                          )}
                          {!isFinalizado && (
                              <td style={{...s.td,textAlign:'right'}}>
                                <div style={{display:'flex',gap:5,justifyContent:'flex-end'}}>
                                  <button style={s.btnEdit} onClick={()=>{setModalData(t);setModal('externo-edit')}}>
                                    <Pencil size={12}/>
                                  </button>
                                  <button style={s.btnDanger} onClick={()=>handleEliminarExterno(t.id)}>
                                    <Trash2 size={12}/>
                                  </button>
                                </div>
                              </td>
                          )}
                        </tr>
                    )
                  })}
                  <tr>
                    <td colSpan={esAdmin() ? 3 : 1} style={{...s.td,fontWeight:700,color:'var(--text-muted)',fontSize:11,textAlign:'right'}}>SUBTOTAL</td>
                    <td style={{...s.tdNum,fontWeight:700,color:'var(--accent)'}}>Bs. {ext.toFixed(2)}</td>
                    {esAdmin() && <td style={s.td}/>}
                    {!isFinalizado && <td style={s.td}/>}
                  </tr>
                  </tbody>
                </table>
              </div>
          }
        </div>

        {/* HISTORIAL */}
        <div style={s.card}>
          <div style={{...s.sLabel,marginBottom:14}}><Clock size={14}/> Historial de cambios</div>
          {!(card.trabajos_realizados?.length)
              ? <TablaVacia msg="Sin registros"/>
              : [...card.trabajos_realizados].reverse().map(tr=>{
                const info = ESTADOS.find(e=>e.key===tr.estado_hasta)
                return (
                    <div key={tr.id} style={s.logItem}>
                      <div style={s.logDot(info?.color)}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,color:'var(--text)'}}>
                          {tr.estado_desde
                              ? <><span style={{color:'var(--text-muted)'}}>{ESTADOS.find(e=>e.key===tr.estado_desde)?.label||tr.estado_desde}</span>{' → '}<b style={{color:info?.color}}>{info?.label||tr.estado_hasta}</b></>
                              : <b style={{color:info?.color}}>Servicio creado</b>
                          }
                        </div>
                        {tr.mecanico && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{tr.mecanico.nombre}</div>}
                        {tr.nota && <div style={{fontSize:12,color:'var(--text-soft)',marginTop:2,fontStyle:'italic'}}>{tr.nota}</div>}
                        <div style={{fontSize:11,color:'var(--text-muted)',marginTop:3}}>{new Date(tr.creado_en).toLocaleString('es-BO')}</div>
                      </div>
                    </div>
                )
              })
          }
        </div>

        {/* MODALS */}
        {modal==='servicio' && (
            <ModalServicio token={token} cardId={card.id} servicio={null}
                           onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}}/>
        )}
        {modal==='servicio-edit' && modalData && (
            <ModalServicio token={token} cardId={card.id} servicio={modalData}
                           onClose={()=>{setModal(null);setModalData(null)}}
                           onSaved={()=>{setModal(null);setModalData(null);load()}}/>
        )}
        {modal==='reemplazo' && (
            <ModalReemplazo token={token} cardId={card.id} insumos={insumos} reemplazo={null}
                            onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}}/>
        )}
        {modal==='reemplazo-edit' && modalData && (
            <ModalReemplazo token={token} cardId={card.id} insumos={insumos} reemplazo={modalData}
                            onClose={()=>{setModal(null);setModalData(null)}}
                            onSaved={()=>{setModal(null);setModalData(null);load()}}/>
        )}
        {modal==='externo' && (
            <ModalExterno token={token} cardId={card.id} externo={null}
                          onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}}/>
        )}
        {modal==='externo-edit' && modalData && (
            <ModalExterno token={token} cardId={card.id} externo={modalData}
                          onClose={()=>{setModal(null);setModalData(null)}}
                          onSaved={()=>{setModal(null);setModalData(null);load()}}/>
        )}
        {modal==='mecanico' && (
            <ModalMecanico token={token} cardId={card.id} mecanicos={mecanicos}
                           mecanicoActual={card.mecanico_id}
                           onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}}/>
        )}
        {modal==='pago' && (
            <ModalPago token={token} cardId={card.id} pagadoActual={card.pagado} metodoActual={card.metodo_pago}
                       onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}}/>
        )}
        {modal==='moto' && (
            <ModalMoto token={token} card={card}
                       onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}}/>
        )}
      </div>
  )
}