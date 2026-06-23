import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Phone, Wrench, Calendar, Plus, Trash2, Pencil, ChevronRight, Clock, FileText, Package, CheckCircle } from 'lucide-react'
import { api } from '../lib/apiClient'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const ESTADOS = [
  { key:'NUEVO',      label:'Nuevo',      color:'var(--estado-nuevo)',      next:['EN_CURSO'] },
  { key:'EN_CURSO',   label:'En Curso',   color:'var(--estado-en-curso)',   next:['PAUSADO','TERMINADO'] },
  { key:'PAUSADO',    label:'Pausado',    color:'var(--estado-pausado)',    next:['EN_CURSO','TERMINADO'] },
  { key:'TERMINADO',  label:'Terminado',  color:'var(--estado-terminado)',  next:['PRUEBAS'] },
  { key:'PRUEBAS',    label:'Pruebas',    color:'var(--estado-pruebas)',    next:['EN_CURSO','FINALIZADO'] },
  { key:'FINALIZADO', label:'Finalizado', color:'var(--estado-finalizado)', next:[] },
]

const SERVICIOS = [
  { value:'MANTENIMIENTO_BASICO',   label:'Mantenimiento Básico' },
  { value:'MANTENIMIENTO_COMPLETO', label:'Mantenimiento Completo' },
  { value:'CAMBIO_ACEITE',          label:'Cambio de Aceite' },
  { value:'REPARACION_TELESCOPIO',  label:'Reparación de Telescopio' },
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
  modal:      { width:'100%', maxWidth:420, background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:26, maxHeight:'90vh', overflowY:'auto' },
  modalTitle: { fontSize:15, fontWeight:'bold', color:'var(--text-strong)', marginBottom:16 },
  btnRow:     { display:'flex', gap:8, marginTop:8 },
  btnCancel:  { flex:1, padding:'9px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-soft)', fontSize:13, cursor:'pointer' },
  btnSave:    { flex:1, padding:'9px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:13, fontWeight:600, cursor:'pointer' },
}

function calcTotal(card) {
  const serv = (card.servicios_realizados||[]).reduce((a,s)=>a+(s.precio||0),0)
  const remp = (card.reemplazos||[]).reduce((a,r)=>a+r.precio*r.cantidad,0)
  const ext  = (card.trabajos_externos||[]).reduce((a,t)=>a+t.precio_final,0)
  return { serv, remp, ext, total: serv+remp+ext }
}

// ── Modal Servicio Realizado ──────────────────────────────────
function ModalServicio({ token, cardId, servicio, onClose, onSaved }) {
  const isEdit = !!servicio
  const [form, setForm] = useState({
    nombre: servicio?.nombre||'',
    descripcion: servicio?.descripcion||'',
    precio: servicio?.precio||'',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombre||form.precio==='') { toast.error('Nombre y precio son requeridos'); return }
    setSaving(true)
    const data = { card_id:cardId, nombre:form.nombre, descripcion:form.descripcion||null, precio:parseFloat(form.precio) }
    const res = isEdit
      ? await api.actualizarServicioRealizado({ token, id:servicio.id, data })
      : await api.crearServicioRealizado({ token, data })
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success(isEdit?'Servicio actualizado':'Servicio agregado')
    onSaved()
  }

  return (
    <div style={s.overlay} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{isEdit?'Editar Servicio Realizado':'Agregar Servicio Realizado'}</div>
        <form onSubmit={handleSave}>
          <label style={s.label}>Nombre del servicio *</label>
          <input style={s.input} value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Cambio de aceite, Ajuste de frenos..." required />
          <label style={s.label}>Descripción (opcional)</label>
          <textarea style={{...s.input,resize:'vertical',minHeight:60}} value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Detalles del trabajo realizado..." />
          <label style={s.label}>Precio (Bs.) *</label>
          <input style={s.input} type="number" min="0" step="0.01" value={form.precio} onChange={e=>setForm(f=>({...f,precio:e.target.value}))} placeholder="0.00" required />
          <div style={s.btnRow}>
            <button type="button" style={s.btnCancel} onClick={onClose}>Cancelar</button>
            <button type="submit" style={{...s.btnSave,opacity:saving?.6:1}} disabled={saving}>{saving?'Guardando…':isEdit?'Actualizar':'Agregar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Reemplazo ───────────────────────────────────────────
function ModalReemplazo({ token, cardId, insumos, onClose, onSaved }) {
  const [form, setForm] = useState({ insumo_id:'', nombre:'', precio:'', cantidad:1 })
  const [saving, setSaving] = useState(false)

  const handleInsumo = (id) => {
    const ins = insumos.find(i=>String(i.id)===String(id))
    if (ins) setForm(f=>({...f,insumo_id:id,nombre:ins.nombre,precio:ins.precio}))
    else setForm(f=>({...f,insumo_id:''}))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombre||form.precio==='') { toast.error('Nombre y precio requeridos'); return }
    setSaving(true)
    const res = await api.crearReemplazo({ token, data:{ card_id:cardId, insumo_id:form.insumo_id||null, nombre:form.nombre, precio:parseFloat(form.precio), cantidad:parseInt(form.cantidad)||1 }})
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success('Reemplazo agregado')
    onSaved()
  }

  return (
    <div style={s.overlay} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={s.modal}>
        <div style={s.modalTitle}>Agregar Reemplazo / Repuesto</div>
        <form onSubmit={handleSave}>
          <label style={s.label}>Desde insumos del catálogo</label>
          <select style={s.select} value={form.insumo_id} onChange={e=>handleInsumo(e.target.value)}>
            <option value="">— Seleccionar insumo —</option>
            {insumos.map(i=><option key={i.id} value={i.id}>{i.nombre} — Bs. {i.precio}</option>)}
          </select>
          <label style={s.label}>Nombre del repuesto *</label>
          <input style={s.input} value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Filtro de aire, Bujía..." required />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={s.label}>Precio unitario (Bs.) *</label>
              <input style={s.input} type="number" min="0" step="0.01" value={form.precio} onChange={e=>setForm(f=>({...f,precio:e.target.value}))} placeholder="0.00" required />
            </div>
            <div>
              <label style={s.label}>Cantidad</label>
              <input style={s.input} type="number" min="1" value={form.cantidad} onChange={e=>setForm(f=>({...f,cantidad:e.target.value}))} />
            </div>
          </div>
          <div style={s.btnRow}>
            <button type="button" style={s.btnCancel} onClick={onClose}>Cancelar</button>
            <button type="submit" style={{...s.btnSave,opacity:saving?.6:1}} disabled={saving}>{saving?'Guardando…':'Agregar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Trabajo Externo ─────────────────────────────────────
function ModalExterno({ token, cardId, onClose, onSaved }) {
  const [form, setForm] = useState({ detalle:'', precio_final:'', costo:'' })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await api.crearTrabajoExterno({ token, data:{ card_id:cardId, detalle:form.detalle, precio_final:parseFloat(form.precio_final), costo:parseFloat(form.costo)||0 }})
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success('Trabajo externo agregado')
    onSaved()
  }

  return (
    <div style={s.overlay} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={s.modal}>
        <div style={s.modalTitle}>Agregar Trabajo Externo</div>
        <form onSubmit={handleSave}>
          <label style={s.label}>Detalle *</label>
          <textarea style={{...s.input,resize:'vertical',minHeight:70}} value={form.detalle} onChange={e=>setForm(f=>({...f,detalle:e.target.value}))} placeholder="Descripción del trabajo realizado por terceros..." required />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={s.label}>Precio cobrado al cliente (Bs.) *</label>
              <input style={s.input} type="number" min="0" step="0.01" value={form.precio_final} onChange={e=>setForm(f=>({...f,precio_final:e.target.value}))} placeholder="0.00" required />
            </div>
            <div>
              <label style={s.label}>Costo real (Bs.)</label>
              <input style={s.input} type="number" min="0" step="0.01" value={form.costo} onChange={e=>setForm(f=>({...f,costo:e.target.value}))} placeholder="0.00" />
            </div>
          </div>
          <div style={s.btnRow}>
            <button type="button" style={s.btnCancel} onClick={onClose}>Cancelar</button>
            <button type="submit" style={{...s.btnSave,opacity:saving?.6:1}} disabled={saving}>{saving?'Guardando…':'Agregar'}</button>
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
        <div style={s.modalTitle}>Asignar Mecánico</div>
        <form onSubmit={handleSave}>
          <label style={s.label}>Mecánico *</label>
          <select style={s.select} value={mecId} onChange={e=>setMecId(e.target.value)} required>
            <option value="">— Seleccionar —</option>
            {mecanicos.map(m=><option key={m.id} value={m.id}>{m.nombre} ({m.tipo_sueldo})</option>)}
          </select>
          <div style={s.btnRow}>
            <button type="button" style={s.btnCancel} onClick={onClose}>Cancelar</button>
            <button type="submit" style={{...s.btnSave,opacity:saving?.6:1}} disabled={saving}>{saving?'Asignando…':'Asignar y poner En Curso'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Tabla genérica con botones ────────────────────────────────
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
  const [modal, setModal] = useState(null) // 'servicio'|'servicio-edit'|'reemplazo'|'externo'|'mecanico'
  const [modalData, setModalData] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [resCard, resIns, resMec] = await Promise.all([
      api.obtenerCard({ token, id }),
      api.listarInsumos({ token }),
      esAdmin() ? api.listarUsuarios({ token }) : Promise.resolve({ ok:true, data:[] }),
    ])
    if (resCard.ok) setCard(resCard.data)
    else { toast.error('Card no encontrada'); navigate('/tablero') }
    if (resIns.ok) setInsumos(resIns.data||[])
    if (resMec.ok) setMecanicos((resMec.data||[]).filter(u=>u.rol==='MECANICO'&&u.activo))
    setLoading(false)
  }, [token, id])

  useEffect(() => { load() }, [load])

  const estadoInfo = card ? ESTADOS.find(e=>e.key===card.estado) : null
  const servicio   = card ? SERVICIOS.find(s=>s.value===card.tipo_servicio) : null
  const { serv, remp, ext, total } = card ? calcTotal(card) : { serv:0, remp:0, ext:0, total:0 }
  const isFinalizado = card?.estado === 'FINALIZADO'
  const nextEstados = estadoInfo?.next || []

  const handleCambiarEstado = async (nuevoEstado) => {
    setSaving(true)
    const res = await api.cambiarEstadoCard({ token, id, estado:nuevoEstado })
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success(`→ ${ESTADOS.find(e=>e.key===nuevoEstado)?.label}`)
    load()
  }

  const handleEliminarServicio = async (sid) => {
    if (!confirm('¿Eliminar este servicio?')) return
    const res = await api.eliminarServicioRealizado({ token, id:sid })
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success('Servicio eliminado'); load()
  }

  const handleEliminarReemplazo = async (rid) => {
    if (!confirm('¿Eliminar este reemplazo?')) return
    const res = await api.eliminarReemplazo({ token, id:rid })
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success('Reemplazo eliminado'); load()
  }

  const handleEliminarExterno = async (tid) => {
    if (!confirm('¿Eliminar este trabajo externo?')) return
    const res = await api.eliminarTrabajoExterno({ token, id:tid })
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success('Trabajo externo eliminado'); load()
  }

  if (loading) return <div style={{padding:60,textAlign:'center',color:'var(--text-muted)'}}>Cargando…</div>
  if (!card) return null

  return (
    <div style={s.shell}>
      <button style={s.back} onClick={()=>navigate('/tablero')}>
        <ArrowLeft size={14} /> Volver al tablero
      </button>

      {/* ── ENCABEZADO ── */}
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
            {card.estado==='NUEVO' && esAdmin() && (
              <button style={s.btnGhost} onClick={()=>setModal('mecanico')}>
                <User size={13}/> Asignar mecánico
              </button>
            )}
            {nextEstados.filter(e=>!(e==='EN_CURSO'&&card.estado==='NUEVO')).map(e=>{
              const info = ESTADOS.find(x=>x.key===e)
              return (
                <button key={e} style={s.btnEstado(info?.color||'#888')} onClick={()=>handleCambiarEstado(e)} disabled={saving}>
                  <ChevronRight size={13}/>{info?.label}
                </button>
              )
            })}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8}}>
          {card.cliente_telefono && <div style={s.metaRow}><Phone size={13} color="var(--accent)"/>{card.cliente_telefono}</div>}
          <div style={s.metaRow}><Wrench size={13} color="var(--accent)"/>{servicio?.label||card.tipo_servicio}</div>
          <div style={s.metaRow}><Calendar size={13} color="var(--accent)"/>{card.fecha}</div>
          {card.mecanico && <div style={s.metaRow}><User size={13} color="var(--accent)"/>{card.mecanico.nombre}</div>}
        </div>
        {card.notas && (
          <div style={{marginTop:12,padding:'9px 13px',background:'var(--bg)',borderRadius:8,fontSize:13,color:'var(--text-soft)',borderLeft:'3px solid var(--accent)'}}>
            {card.notas}
          </div>
        )}
      </div>

      {/* ── TOTAL ── */}
      <div style={{...s.totalBox,marginBottom:14}}>
        <div>
          <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:4}}>Desglose del total</div>
          <div style={{fontSize:12,color:'var(--text-soft)'}}>
            Servicios: <b style={{color:'var(--text)'}}>Bs. {serv.toFixed(2)}</b>
            {' '}&nbsp;·&nbsp;{' '}
            Reemplazos: <b style={{color:'var(--text)'}}>Bs. {remp.toFixed(2)}</b>
            {' '}&nbsp;·&nbsp;{' '}
            Externos: <b style={{color:'var(--text)'}}>Bs. {ext.toFixed(2)}</b>
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:2}}>Total a pagar</div>
          <div style={{fontSize:24,fontWeight:'bold',color:'var(--accent)'}}>Bs. {total.toFixed(2)}</div>
        </div>
      </div>

      {/* ── SERVICIOS REALIZADOS ── */}
      <div style={s.card}>
        <div style={s.sectionTtl}>
          <div style={s.sLabel}><CheckCircle size={14}/> Servicios Realizados</div>
          {!isFinalizado && (
            <button style={s.btnGhost} onClick={()=>setModal('servicio')}>
              <Plus size={13}/> Agregar
            </button>
          )}
        </div>
        {!card.servicios_realizados?.length
          ? <TablaVacia msg="Sin servicios registrados — agrega los trabajos realizados por el mecánico" />
          : <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    <th style={s.th}>Servicio</th>
                    <th style={s.th}>Descripción</th>
                    <th style={{...s.th,textAlign:'right'}}>Precio</th>
                    {!isFinalizado && <th style={s.th}></th>}
                  </tr>
                </thead>
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
                    <td colSpan={2} style={{...s.td,fontWeight:700,color:'var(--text-muted)',fontSize:11,textAlign:'right'}}>SUBTOTAL SERVICIOS</td>
                    <td style={{...s.tdNum,fontWeight:700}}>Bs. {serv.toFixed(2)}</td>
                    {!isFinalizado && <td style={s.td}/>}
                  </tr>
                </tbody>
              </table>
            </div>
        }
      </div>

      {/* ── REEMPLAZOS ── */}
      <div style={s.card}>
        <div style={s.sectionTtl}>
          <div style={s.sLabel}><Package size={14}/> Reemplazos / Repuestos</div>
          {!isFinalizado && (
            <button style={s.btnGhost} onClick={()=>setModal('reemplazo')}>
              <Plus size={13}/> Agregar
            </button>
          )}
        </div>
        {!card.reemplazos?.length
          ? <TablaVacia msg="Sin reemplazos registrados" />
          : <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    <th style={s.th}>Repuesto</th>
                    <th style={{...s.th,textAlign:'right'}}>Precio unit.</th>
                    <th style={{...s.th,textAlign:'right'}}>Cant.</th>
                    <th style={{...s.th,textAlign:'right'}}>Subtotal</th>
                    {!isFinalizado && <th style={s.th}></th>}
                  </tr>
                </thead>
                <tbody>
                  {card.reemplazos.map(r=>(
                    <tr key={r.id}>
                      <td style={{...s.td,fontWeight:500}}>{r.nombre}</td>
                      <td style={{...s.td,textAlign:'right',color:'var(--text-soft)'}}>Bs. {r.precio}</td>
                      <td style={{...s.td,textAlign:'right',color:'var(--text-soft)'}}>x{r.cantidad}</td>
                      <td style={s.tdNum}>Bs. {(r.precio*r.cantidad).toFixed(2)}</td>
                      {!isFinalizado && (
                        <td style={s.td}>
                          <button style={s.btnDanger} onClick={()=>handleEliminarReemplazo(r.id)}>
                            <Trash2 size={12}/>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} style={{...s.td,fontWeight:700,color:'var(--text-muted)',fontSize:11,textAlign:'right'}}>SUBTOTAL REEMPLAZOS</td>
                    <td style={{...s.tdNum,fontWeight:700}}>Bs. {remp.toFixed(2)}</td>
                    {!isFinalizado && <td style={s.td}/>}
                  </tr>
                </tbody>
              </table>
            </div>
        }
      </div>

      {/* ── TRABAJOS EXTERNOS ── */}
      <div style={s.card}>
        <div style={s.sectionTtl}>
          <div style={s.sLabel}><FileText size={14}/> Trabajos Externos</div>
          {!isFinalizado && (
            <button style={s.btnGhost} onClick={()=>setModal('externo')}>
              <Plus size={13}/> Agregar
            </button>
          )}
        </div>
        {!card.trabajos_externos?.length
          ? <TablaVacia msg="Sin trabajos externos" />
          : <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    <th style={s.th}>Detalle</th>
                    <th style={{...s.th,textAlign:'right'}}>Precio al cliente</th>
                    <th style={{...s.th,textAlign:'right'}}>Costo real</th>
                    <th style={{...s.th,textAlign:'right'}}>Margen</th>
                    {!isFinalizado && <th style={s.th}></th>}
                  </tr>
                </thead>
                <tbody>
                  {card.trabajos_externos.map(t=>{
                    const margen = t.precio_final-(t.costo||0)
                    return (
                      <tr key={t.id}>
                        <td style={s.td}>{t.detalle}</td>
                        <td style={s.tdNum}>Bs. {t.precio_final}</td>
                        <td style={{...s.td,textAlign:'right',color:'var(--danger)'}}>Bs. {t.costo||0}</td>
                        <td style={{...s.td,textAlign:'right',fontWeight:600,color:margen>=0?'var(--success)':'var(--danger)'}}>
                          Bs. {margen.toFixed(2)}
                        </td>
                        {!isFinalizado && (
                          <td style={s.td}>
                            <button style={s.btnDanger} onClick={()=>handleEliminarExterno(t.id)}>
                              <Trash2 size={12}/>
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                  <tr>
                    <td colSpan={3} style={{...s.td,fontWeight:700,color:'var(--text-muted)',fontSize:11,textAlign:'right'}}>SUBTOTAL EXTERNOS</td>
                    <td style={{...s.tdNum,fontWeight:700}}>Bs. {ext.toFixed(2)}</td>
                    {!isFinalizado && <td style={s.td}/>}
                  </tr>
                </tbody>
              </table>
            </div>
        }
      </div>

      {/* ── HISTORIAL ── */}
      <div style={s.card}>
        <div style={{...s.sLabel,marginBottom:14}}><Clock size={14}/> Historial de cambios</div>
        {!card.trabajos_realizados?.length
          ? <TablaVacia msg="Sin registros" />
          : [...card.trabajos_realizados].reverse().map(tr=>{
              const info = ESTADOS.find(e=>e.key===tr.estado_hasta)
              return (
                <div key={tr.id} style={s.logItem}>
                  <div style={s.logDot(info?.color)}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:'var(--text)'}}>
                      {tr.estado_desde
                        ? <><span style={{color:'var(--text-muted)'}}>{ESTADOS.find(e=>e.key===tr.estado_desde)?.label||tr.estado_desde}</span>{' → '}<b style={{color:info?.color}}>{info?.label||tr.estado_hasta}</b></>
                        : <b style={{color:info?.color}}>Card creada</b>
                      }
                    </div>
                    {tr.mecanico && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}><User size={10} style={{display:'inline'}}/> {tr.mecanico.nombre}</div>}
                    {tr.nota && <div style={{fontSize:12,color:'var(--text-soft)',marginTop:2,fontStyle:'italic'}}>{tr.nota}</div>}
                    <div style={{fontSize:11,color:'var(--text-muted)',marginTop:3}}>{new Date(tr.creado_en).toLocaleString('es-BO')}</div>
                  </div>
                </div>
              )
            })
        }
      </div>

      {/* ── MODALS ── */}
      {modal==='servicio' && (
        <ModalServicio token={token} cardId={card.id} servicio={null}
          onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}} />
      )}
      {modal==='servicio-edit' && modalData && (
        <ModalServicio token={token} cardId={card.id} servicio={modalData}
          onClose={()=>{setModal(null);setModalData(null)}} onSaved={()=>{setModal(null);setModalData(null);load()}} />
      )}
      {modal==='reemplazo' && (
        <ModalReemplazo token={token} cardId={card.id} insumos={insumos}
          onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}} />
      )}
      {modal==='externo' && (
        <ModalExterno token={token} cardId={card.id}
          onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}} />
      )}
      {modal==='mecanico' && (
        <ModalMecanico token={token} cardId={card.id} mecanicos={mecanicos}
          mecanicoActual={card.mecanico_id}
          onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load()}} />
      )}
    </div>
  )
}
