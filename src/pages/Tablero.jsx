import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, User, Phone, Wrench, Clock, Search, X, ChevronDown } from 'lucide-react'
import { api } from '../lib/apiClient'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const ESTADOS = [
  { key:'NUEVO',      label:'Nuevo',      color:'var(--estado-nuevo)' },
  { key:'EN_CURSO',   label:'En Curso',   color:'var(--estado-en-curso)' },
  { key:'PAUSADO',    label:'Pausado',    color:'var(--estado-pausado)' },
  { key:'TERMINADO',  label:'Terminado',  color:'var(--estado-terminado)' },
  { key:'PRUEBAS',    label:'Pruebas',    color:'var(--estado-pruebas)' },
  { key:'FINALIZADO', label:'Finalizado', color:'var(--estado-finalizado)' },
]

const SERVICIOS = [
  { value:'MANTENIMIENTO_BASICO',   label:'Mantenimiento Básico' },
  { value:'MANTENIMIENTO_COMPLETO', label:'Mantenimiento Completo' },
  { value:'CAMBIO_ACEITE',          label:'Cambio de Aceite' },
  { value:'REPARACION_TELESCOPIO',  label:'Reparación de Telescopio' },
]

const s = {
  shell:     { padding:'20px' },
  header:    { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 },
  title:     { fontSize:20, fontWeight:'bold', color:'var(--text-strong)' },
  sub:       { fontSize:11, color:'var(--text-muted)', marginTop:3 },
  btnPrimary:{ display:'flex', alignItems:'center', gap:6, padding:'8px 15px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:12, fontWeight:600, cursor:'pointer' },
  btnGhost:  { display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:7, border:'1px solid var(--border)', background:'transparent', color:'var(--text-soft)', fontSize:12, cursor:'pointer' },
  filterBar: { display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' },
  searchBox: { position:'relative', flex:'1', minWidth:180, maxWidth:280 },
  searchInp: { width:'100%', background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 32px 7px 32px', color:'var(--text)', fontSize:12 },
  searchIcon:{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' },
  clearBtn:  { position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:2, display:'flex' },
  filterSel: { background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 10px', color:'var(--text)', fontSize:12, cursor:'pointer' },
  badge:     (c) => ({ display:'inline-block', padding:'1px 6px', borderRadius:9999, fontSize:9, fontWeight:700, background:`${c}22`, color:c }),
  colHeader: (c) => ({ color:c, borderBottom:`2px solid ${c}` }),
  cardName:  { fontSize:12, fontWeight:600, color:'var(--text-strong)', marginBottom:3 },
  cardMeta:  { display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--text-muted)', marginBottom:2 },
  cardTotal: { fontSize:12, fontWeight:700, color:'var(--accent)', marginTop:6, paddingTop:5, borderTop:'1px solid var(--border)' },
  emptyCol:  { textAlign:'center', padding:'20px 6px', fontSize:10, color:'var(--text-muted)', border:'1px dashed var(--border)', borderRadius:7 },
  // modal
  overlay:   { position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:16 },
  modal:     { width:'100%', maxWidth:440, background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:26, maxHeight:'92vh', overflowY:'auto' },
  modalTitle:{ fontSize:16, fontWeight:'bold', color:'var(--text-strong)', marginBottom:18, display:'flex', alignItems:'center', justifyContent:'space-between' },
  label:     { display:'block', fontSize:11, fontWeight:600, color:'var(--text-muted)', marginBottom:5, letterSpacing:'.4px', textTransform:'uppercase' },
  input:     { width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', color:'var(--text)', fontSize:13, marginBottom:13 },
  select:    { width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', color:'var(--text)', fontSize:13, marginBottom:13 },
  infoBox:   { background:'var(--accent-weak)', border:'1px solid var(--accent)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--text-soft)', marginBottom:14 },
  btnRow:    { display:'flex', gap:8, marginTop:6 },
  btnCancel: { flex:1, padding:'10px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-soft)', fontSize:13, cursor:'pointer' },
  btnSave:   { flex:1, padding:'10px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:13, fontWeight:600, cursor:'pointer' },
}

function calcTotal(card) {
  const serv = (card.servicios_realizados||[]).reduce((a,s)=>a+(s.precio||0),0)
  const remp = (card.reemplazos||[]).reduce((a,r)=>a+r.precio*r.cantidad,0)
  const ext  = (card.trabajos_externos||[]).reduce((a,t)=>a+t.precio_final,0)
  return serv+remp+ext
}

function CardKanban({ card, onClick }) {
  const estado  = ESTADOS.find(e=>e.key===card.estado)
  const servicio= SERVICIOS.find(s=>s.value===card.tipo_servicio)
  const total   = calcTotal(card)
  return (
    <div className="kanban-card" onClick={()=>onClick(card.id)}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
        <span style={s.badge(estado?.color||'#888')}>{estado?.label||card.estado}</span>
        <span style={{fontSize:9,color:'var(--text-muted)'}}>#{card.id}</span>
      </div>
      <div style={s.cardName}>{card.cliente_nombre}</div>
      {card.cliente_telefono && <div style={s.cardMeta}><Phone size={10}/>{card.cliente_telefono}</div>}
      <div style={s.cardMeta}><Wrench size={10}/>{servicio?.label||card.tipo_servicio}</div>
      {card.mecanico && <div style={s.cardMeta}><User size={10}/>{card.mecanico.nombre}</div>}
      <div style={s.cardMeta}><Clock size={10}/>{card.fecha}</div>
      {total > 0 && <div style={s.cardTotal}>Bs. {total.toFixed(2)}</div>}
    </div>
  )
}

export default function Tablero() {
  const { token, esAdmin } = useAuthStore()
  const navigate = useNavigate()
  const [cards, setCards] = useState([])
  const [mecanicos, setMecanicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroMecanico, setFiltroMecanico] = useState('')
  const [filtroServicio, setFiltroServicio] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [form, setForm] = useState({
    cliente_nombre:'', cliente_telefono:'',
    fecha: new Date().toISOString().slice(0,10),
    tipo_servicio:'MANTENIMIENTO_BASICO', notas:'',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [resCards, resMec] = await Promise.all([
      api.listarCards({ token }),
      esAdmin() ? api.listarUsuarios({ token }) : Promise.resolve({ ok:true, data:[] }),
    ])
    if (resCards.ok) setCards(resCards.data||[])
    if (resMec.ok) setMecanicos((resMec.data||[]).filter(u=>u.rol==='MECANICO'&&u.activo))
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  // Filtrado reactivo
  const cardsFiltradas = useMemo(() => {
    return cards.filter(c => {
      const bq = busqueda.toLowerCase()
      if (bq && !c.cliente_nombre.toLowerCase().includes(bq) &&
          !String(c.id).includes(bq) &&
          !(c.cliente_telefono||'').includes(bq)) return false
      if (filtroMecanico && c.mecanico_id !== filtroMecanico) return false
      if (filtroServicio && c.tipo_servicio !== filtroServicio) return false
      if (filtroEstado && c.estado !== filtroEstado) return false
      return true
    })
  }, [cards, busqueda, filtroMecanico, filtroServicio, filtroEstado])

  const hayFiltros = busqueda || filtroMecanico || filtroServicio || filtroEstado

  const limpiarFiltros = () => {
    setBusqueda(''); setFiltroMecanico(''); setFiltroServicio(''); setFiltroEstado('')
  }

  const handleCrear = async (e) => {
    e.preventDefault()
    if (!form.cliente_nombre.trim()) { toast.error('El nombre del cliente es requerido'); return }
    setSaving(true)
    const res = await api.crearCard({ token, data: form })
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error||'Error'); return }
    toast.success('Orden creada — agrega los servicios desde la card')
    setShowModal(false)
    setForm({ cliente_nombre:'', cliente_telefono:'', fecha:new Date().toISOString().slice(0,10), tipo_servicio:'MANTENIMIENTO_BASICO', notas:'' })
    load()
  }

  const cardsPorEstado = (estado) => cardsFiltradas.filter(c=>c.estado===estado)
  const totalFiltradas = cardsFiltradas.length
  const totalCards = cards.length

  return (
    <div style={s.shell}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>Tablero de Trabajo</div>
          <div style={s.sub}>
            {hayFiltros
              ? `${totalFiltradas} de ${totalCards} órdenes`
              : `${totalCards} órdenes activas`
            }
          </div>
        </div>
        <div style={{display:'flex',gap:7}}>
          <button style={s.btnGhost} onClick={load} disabled={loading}>
            <RefreshCw size={13} style={{animation:loading?'spin 1s linear infinite':'none'}}/>
            Actualizar
          </button>
          <button style={s.btnPrimary} onClick={()=>setShowModal(true)}>
            <Plus size={14}/> Nueva Card
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      <div style={s.filterBar}>
        <div style={s.searchBox}>
          <Search size={13} style={s.searchIcon}/>
          <input
            style={s.searchInp}
            placeholder="Buscar cliente, teléfono, #..."
            value={busqueda}
            onChange={e=>setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button style={s.clearBtn} onClick={()=>setBusqueda('')}>
              <X size={13}/>
            </button>
          )}
        </div>

        {esAdmin() && mecanicos.length > 0 && (
          <select style={s.filterSel} value={filtroMecanico} onChange={e=>setFiltroMecanico(e.target.value)}>
            <option value="">Todos los mecánicos</option>
            {mecanicos.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        )}

        <select style={s.filterSel} value={filtroServicio} onChange={e=>setFiltroServicio(e.target.value)}>
          <option value="">Todos los servicios</option>
          {SERVICIOS.map(sv=><option key={sv.value} value={sv.value}>{sv.label}</option>)}
        </select>

        <select style={s.filterSel} value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e=><option key={e.key} value={e.key}>{e.label}</option>)}
        </select>

        {hayFiltros && (
          <button style={{...s.btnGhost, color:'var(--accent)', borderColor:'var(--accent)', fontSize:11}} onClick={limpiarFiltros}>
            <X size={12}/> Limpiar
          </button>
        )}
      </div>

      {/* Tablero kanban */}
      {loading
        ? <div style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>Cargando tablero…</div>
        : <div className="kanban-board">
            {ESTADOS.map(est=>{
              const cols = cardsPorEstado(est.key)
              return (
                <div key={est.key} className="kanban-col">
                  <div className="kanban-col-header" style={s.colHeader(est.color)}>
                    <span>{est.label}</span>
                    <span style={s.badge(est.color)}>{cols.length}</span>
                  </div>
                  {cols.length === 0
                    ? <div style={s.emptyCol}>Sin órdenes</div>
                    : cols.map(card=><CardKanban key={card.id} card={card} onClick={id=>navigate(`/cards/${id}`)}/>)
                  }
                </div>
              )
            })}
          </div>
      }

      {/* Modal nueva card */}
      {showModal && (
        <div style={s.overlay} onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
          <div style={s.modal}>
            <div style={s.modalTitle}>
              <span>Nueva Orden de Trabajo</span>
              <button onClick={()=>setShowModal(false)} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',padding:2}}>
                <X size={18}/>
              </button>
            </div>

            <div style={s.infoBox}>
              Los precios se registran desde la card — agrega servicios, reemplazos y trabajos externos una vez creada la orden.
            </div>

            <form onSubmit={handleCrear}>
              <label style={s.label}>Nombre del cliente *</label>
              <input
                style={s.input}
                value={form.cliente_nombre}
                onChange={e=>setForm(f=>({...f,cliente_nombre:e.target.value}))}
                placeholder="Juan Pérez"
                required
              />

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label style={s.label}>Teléfono</label>
                  <input style={s.input} value={form.cliente_telefono} onChange={e=>setForm(f=>({...f,cliente_telefono:e.target.value}))} placeholder="70000000"/>
                </div>
                <div>
                  <label style={s.label}>Fecha *</label>
                  <input style={s.input} type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} required/>
                </div>
              </div>

              <label style={s.label}>Tipo de servicio *</label>
              <select style={s.select} value={form.tipo_servicio} onChange={e=>setForm(f=>({...f,tipo_servicio:e.target.value}))} required>
                {SERVICIOS.map(sv=><option key={sv.value} value={sv.value}>{sv.label}</option>)}
              </select>

              <label style={s.label}>Notas iniciales</label>
              <textarea
                style={{...s.input,resize:'vertical',minHeight:64}}
                value={form.notas}
                onChange={e=>setForm(f=>({...f,notas:e.target.value}))}
                placeholder="Observaciones, síntomas reportados por el cliente…"
              />

              <div style={s.btnRow}>
                <button type="button" style={s.btnCancel} onClick={()=>setShowModal(false)}>Cancelar</button>
                <button type="submit" style={{...s.btnSave,opacity:saving?.6:1}} disabled={saving}>
                  {saving?'Creando…':'Crear Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
