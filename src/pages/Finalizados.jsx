import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Eye, User, Phone, Wrench, Calendar, CheckCircle, Package, FileText } from 'lucide-react'
import { api } from '../lib/apiClient'
import useAuthStore from '../store/authStore'

const SERVICIOS_LABEL = {
  MANTENIMIENTO_BASICO:   'Mant. Básico',
  MANTENIMIENTO_COMPLETO: 'Mant. Completo',
  CAMBIO_ACEITE:          'Cambio Aceite',
  REPARACION_TELESCOPIO:  'Rep. Telescopio',
}

const s = {
  shell:    { padding:'24px 20px' },
  header:   { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:10 },
  title:    { fontSize:22, fontWeight:'bold', color:'var(--text-strong)' },
  sub:      { fontSize:12, color:'var(--text-muted)', marginTop:3 },
  filterBar:{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' },
  searchBox:{ position:'relative', flex:'1', minWidth:200, maxWidth:320 },
  searchInp:{ width:'100%', background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px 8px 34px', color:'var(--text)', fontSize:13 },
  searchIco:{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' },
  filterSel:{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:13 },
  // KPIs
  kpiGrid:  { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:24 },
  kpi:      (c) => ({ background:`${c}12`, border:`1px solid ${c}30`, borderRadius:10, padding:'14px 16px' }),
  kpiVal:   (c) => ({ fontSize:20, fontWeight:'bold', color:c, marginBottom:3 }),
  kpiLbl:   { fontSize:11, color:'var(--text-muted)' },
  // Grid
  grid:     { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 },
  card:     { background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', transition:'box-shadow .15s,transform .15s' },
  cardTop:  { background:'linear-gradient(135deg,#002018 0%,#1d6a56 100%)', padding:'16px 18px' },
  cardBody: { padding:'16px 18px' },
  cardFoot: { padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg)' },
  metaRow:  { display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-soft)', marginBottom:5 },
  badge:    (c) => ({ display:'inline-block', padding:'2px 8px', borderRadius:9999, fontSize:10, fontWeight:700, background:`${c}22`, color:c }),
  divider:  { borderTop:'1px solid var(--divider)', margin:'10px 0' },
  itemRow:  { display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-soft)', marginBottom:4 },
  totalRow: { display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:'bold', color:'var(--accent)', marginTop:8, paddingTop:8, borderTop:'1px solid var(--border)' },
  btnVer:   { display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:7, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:12, fontWeight:600, cursor:'pointer' },
  empty:    { gridColumn:'1/-1', textAlign:'center', padding:'60px 20px', color:'var(--text-muted)' },
}

function calcTotal(card) {
  const serv = (card.servicios_realizados||[]).reduce((a,s)=>a+(s.precio||0),0)
  const remp = (card.reemplazos||[]).reduce((a,r)=>a+r.precio*r.cantidad,0)
  const ext  = (card.trabajos_externos||[]).reduce((a,t)=>a+t.precio_final,0)
  const costo= (card.trabajos_externos||[]).reduce((a,t)=>a+(t.costo||0),0) +
               (card.reemplazos||[]).reduce((a,r)=>a+r.precio*r.cantidad,0)
  return { serv, remp, ext, total:serv+remp+ext, costo }
}

function CardFinalizado({ card, onVer }) {
  const { serv, remp, ext, total, costo } = calcTotal(card)
  const neto = total - costo
  const servLbl = SERVICIOS_LABEL[card.tipo_servicio] || card.tipo_servicio

  return (
    <div style={s.card}
      onMouseOver={e=>{ e.currentTarget.style.boxShadow='0 8px 32px var(--shadow)'; e.currentTarget.style.transform='translateY(-2px)' }}
      onMouseOut={e=>{ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none' }}>

      {/* Header verde oscuro */}
      <div style={s.cardTop}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
          <span style={{ fontSize:11, color:'rgba(255,255,255,.5)' }}>#{card.id}</span>
          <span style={{ ...s.badge('#10b981'), background:'rgba(16,185,129,.2)', color:'#a8f1d8' }}>✓ Finalizado</span>
        </div>
        <div style={{ fontSize:17, fontWeight:'bold', color:'#ffffff', marginBottom:4 }}>{card.cliente_nombre}</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.6)' }}>{servLbl}</div>
      </div>

      {/* Detalles */}
      <div style={s.cardBody}>
        {card.cliente_telefono && <div style={s.metaRow}><Phone size={12}/>{card.cliente_telefono}</div>}
        <div style={s.metaRow}><Calendar size={12}/>{card.fecha}</div>
        {card.mecanico && <div style={s.metaRow}><User size={12}/>{card.mecanico.nombre}</div>}

        <div style={s.divider}/>

        {/* Servicios realizados */}
        {(card.servicios_realizados||[]).length > 0 && (
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.5px', textTransform:'uppercase', marginBottom:5, display:'flex', alignItems:'center', gap:4 }}>
              <Wrench size={10}/> Servicios
            </div>
            {card.servicios_realizados.map(sv=>(
              <div key={sv.id} style={s.itemRow}>
                <span>{sv.nombre}</span>
                <span style={{ color:'var(--text)' }}>Bs. {parseFloat(sv.precio).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Reemplazos */}
        {(card.reemplazos||[]).length > 0 && (
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.5px', textTransform:'uppercase', marginBottom:5, display:'flex', alignItems:'center', gap:4 }}>
              <Package size={10}/> Repuestos
            </div>
            {card.reemplazos.map(r=>(
              <div key={r.id} style={s.itemRow}>
                <span>{r.nombre} x{r.cantidad}</span>
                <span style={{ color:'var(--text)' }}>Bs. {(r.precio*r.cantidad).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Externos */}
        {(card.trabajos_externos||[]).length > 0 && (
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.5px', textTransform:'uppercase', marginBottom:5, display:'flex', alignItems:'center', gap:4 }}>
              <FileText size={10}/> Externos
            </div>
            {card.trabajos_externos.map(t=>(
              <div key={t.id} style={s.itemRow}>
                <span>{t.detalle}</span>
                <span style={{ color:'var(--text)' }}>Bs. {parseFloat(t.precio_final).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div style={s.totalRow}>
          <span>Total cobrado</span>
          <span>Bs. {total.toFixed(2)}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--success)', marginTop:3 }}>
          <span>Neto (ganancia)</span>
          <span>Bs. {neto.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={s.cardFoot}>
        <div style={{ fontSize:11, color:'var(--text-muted)' }}>
          {(card.servicios_realizados||[]).length} serv · {(card.reemplazos||[]).length} rep · {(card.trabajos_externos||[]).length} ext
        </div>
        <button style={s.btnVer} onClick={()=>onVer(card.id)}>
          <Eye size={13}/> Ver detalle
        </button>
      </div>
    </div>
  )
}

export default function Finalizados() {
  const { token } = useAuthStore()
  const navigate = useNavigate()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroServicio, setFiltroServicio] = useState('')
  const [filtroMecanico, setFiltroMecanico] = useState('')
  const [mecanicos, setMecanicos] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    const [resCards, resMec] = await Promise.all([
      api.listarCards({ token }),
      api.listarUsuarios({ token }),
    ])
    if (resCards.ok) {
      setCards((resCards.data||[]).filter(c=>c.estado==='FINALIZADO'))
    }
    if (resMec.ok) {
      setMecanicos((resMec.data||[]).filter(u=>u.rol==='MECANICO'))
    }
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  const filtradas = cards.filter(c => {
    const bq = busqueda.toLowerCase()
    if (bq && !c.cliente_nombre.toLowerCase().includes(bq) && !String(c.id).includes(bq)) return false
    if (filtroServicio && c.tipo_servicio !== filtroServicio) return false
    if (filtroMecanico && c.mecanico_id !== filtroMecanico) return false
    return true
  })

  // KPIs globales
  const totalBruto   = filtradas.reduce((a,c) => {
    const {total} = calcTotal(c); return a+total
  }, 0)
  const totalCosto   = filtradas.reduce((a,c) => {
    const {costo} = calcTotal(c); return a+costo
  }, 0)
  const totalNeto    = totalBruto - totalCosto
  const totalServicios = filtradas.reduce((a,c) => {
    return a+(c.servicios_realizados||[]).reduce((b,s)=>b+(s.precio||0),0)
  }, 0)
  const totalMateriales = filtradas.reduce((a,c) => {
    return a+(c.reemplazos||[]).reduce((b,r)=>b+r.precio*r.cantidad,0)
  }, 0)

  return (
    <div style={s.shell}>
      <div style={s.header}>
        <div>
          <div style={s.title}>✅ Servicios Finalizados</div>
          <div style={s.sub}>{filtradas.length} servicios completados</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={s.kpiGrid}>
        <div style={s.kpi('#f59e0b')}>
          <div style={s.kpiVal('#f59e0b')}>Bs. {totalBruto.toFixed(2)}</div>
          <div style={s.kpiLbl}>Total Bruto Cobrado</div>
        </div>
        <div style={s.kpi('#ef4444')}>
          <div style={s.kpiVal('#ef4444')}>Bs. {totalCosto.toFixed(2)}</div>
          <div style={s.kpiLbl}>Gasto en Materiales</div>
        </div>
        <div style={s.kpi('#10b981')}>
          <div style={s.kpiVal('#10b981')}>Bs. {totalNeto.toFixed(2)}</div>
          <div style={s.kpiLbl}>Ganancia Neta</div>
        </div>
        <div style={s.kpi('#8b5cf6')}>
          <div style={s.kpiVal('#8b5cf6')}>Bs. {totalServicios.toFixed(2)}</div>
          <div style={s.kpiLbl}>Ingresos por Mano de Obra</div>
        </div>
        <div style={s.kpi('#06b6d4')}>
          <div style={s.kpiVal('#06b6d4')}>Bs. {totalMateriales.toFixed(2)}</div>
          <div style={s.kpiLbl}>Facturado en Repuestos</div>
        </div>
        <div style={s.kpi('#3b82f6')}>
          <div style={s.kpiVal('#3b82f6')}>{filtradas.length}</div>
          <div style={s.kpiLbl}>Servicios Completados</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={s.filterBar}>
        <div style={s.searchBox}>
          <Search size={13} style={s.searchIco}/>
          <input style={s.searchInp} placeholder="Buscar cliente o #..." value={busqueda}
            onChange={e=>setBusqueda(e.target.value)}/>
        </div>
        <select style={s.filterSel} value={filtroServicio} onChange={e=>setFiltroServicio(e.target.value)}>
          <option value="">Todos los servicios</option>
          {Object.entries(SERVICIOS_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
        {mecanicos.length > 0 && (
          <select style={s.filterSel} value={filtroMecanico} onChange={e=>setFiltroMecanico(e.target.value)}>
            <option value="">Todos los mecánicos</option>
            {mecanicos.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        )}
      </div>

      {/* Grid */}
      {loading
        ? <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>Cargando...</div>
        : <div style={s.grid}>
            {filtradas.length === 0
              ? <div style={s.empty}>
                  <CheckCircle size={40} style={{ display:'block', margin:'0 auto 12px', opacity:.2 }}/>
                  <div>No hay servicios finalizados</div>
                </div>
              : filtradas.map(c=>(
                  <CardFinalizado key={c.id} card={c} onVer={id=>navigate(`/cards/${id}`)}/>
                ))
            }
          </div>
      }
    </div>
  )
}
