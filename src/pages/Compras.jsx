import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, ShoppingCart, TrendingDown } from 'lucide-react'
import { api } from '../lib/apiClient'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const CATEGORIAS = [
  { value:'CONSUMIBLE', label:'Consumible', color:'#f59e0b' },
  { value:'REPUESTO',   label:'Repuesto',   color:'#3b82f6' },
  { value:'HERRAMIENTA',label:'Herramienta',color:'#8b5cf6' },
  { value:'INSUMO',     label:'Insumo',     color:'#10b981' },
  { value:'OTRO',       label:'Otro',       color:'#6b7280' },
]

const s = {
  shell:    { padding:'24px 20px' },
  header:   { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:10 },
  title:    { fontSize:22, fontWeight:'bold', color:'var(--text-strong)' },
  sub:      { fontSize:12, color:'var(--text-muted)', marginTop:3 },
  kpiGrid:  { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 },
  kpi:      (c) => ({ background:`${c}12`, border:`1px solid ${c}30`, borderRadius:10, padding:'14px 16px' }),
  kpiVal:   (c) => ({ fontSize:20, fontWeight:'bold', color:c, marginBottom:3 }),
  kpiLbl:   { fontSize:11, color:'var(--text-muted)' },
  filterBar:{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' },
  filterSel:{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 12px', color:'var(--text)', fontSize:12 },
  card:     { background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' },
  th:       { padding:'9px 14px', fontSize:10, fontWeight:700, letterSpacing:'.5px', textTransform:'uppercase', color:'var(--text-muted)', borderBottom:'1px solid var(--border)', background:'var(--bg)', textAlign:'left' },
  td:       { padding:'11px 14px', borderBottom:'1px solid var(--divider)', color:'var(--text)', fontSize:13, verticalAlign:'middle' },
  tdNum:    { padding:'11px 14px', borderBottom:'1px solid var(--divider)', color:'var(--danger)', fontWeight:600, textAlign:'right', fontSize:13, verticalAlign:'middle' },
  badge:    (c) => ({ display:'inline-block', padding:'2px 8px', borderRadius:9999, fontSize:10, fontWeight:700, background:`${c}22`, color:c }),
  btnPrimary:{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:13, fontWeight:600, cursor:'pointer' },
  btnEdit:  { padding:'5px 8px', borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center' },
  btnDanger:{ padding:'5px 8px', borderRadius:6, border:'1px solid var(--danger)', background:'rgba(239,68,68,.08)', color:'var(--danger)', cursor:'pointer', display:'flex', alignItems:'center' },
  overlay:  { position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:16 },
  modal:    { width:'100%', maxWidth:440, background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:26, maxHeight:'90vh', overflowY:'auto' },
  modalTitle:{ fontSize:15, fontWeight:'bold', color:'var(--text-strong)', marginBottom:16 },
  label:    { display:'block', fontSize:11, fontWeight:600, color:'var(--text-muted)', marginBottom:5, letterSpacing:'.4px', textTransform:'uppercase' },
  input:    { width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', color:'var(--text)', fontSize:13, marginBottom:12 },
  select:   { width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', color:'var(--text)', fontSize:13, marginBottom:12 },
  btnRow:   { display:'flex', gap:8, marginTop:8 },
  btnCancel:{ flex:1, padding:'9px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-soft)', fontSize:13, cursor:'pointer' },
  btnSave:  { flex:1, padding:'9px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:13, fontWeight:600, cursor:'pointer' },
}

function ModalCompra({ token, compra, onClose, onSaved }) {
  const isEdit = !!compra
  const [form, setForm] = useState({
    descripcion: compra?.descripcion || '',
    categoria:   compra?.categoria || 'CONSUMIBLE',
    cantidad:    compra?.cantidad || 1,
    costo_unit:  compra?.costo_unit || '',
    proveedor:   compra?.proveedor || '',
    notas:       compra?.notas || '',
    fecha:       compra?.fecha || new Date().toISOString().slice(0,10),
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.descripcion || !form.costo_unit) { toast.error('Descripción y costo son requeridos'); return }
    setSaving(true)
    const res = isEdit
      ? await api.actualizarCompra({ token, id: compra.id, data: form })
      : await api.crearCompra({ token, data: form })
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error || 'Error'); return }
    toast.success(isEdit ? 'Compra actualizada' : 'Compra registrada')
    onSaved()
  }

  const total = (parseFloat(form.costo_unit) || 0) * (parseInt(form.cantidad) || 1)

  return (
    <div style={s.overlay} onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{isEdit ? 'Editar Compra' : 'Registrar Compra / Salida de Caja'}</div>
        <form onSubmit={handleSave}>
          <label style={s.label}>Descripción *</label>
          <input style={s.input} value={form.descripcion}
            onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))}
            placeholder="Ej: Inyectores Honda, Aceite 20W50..." required />

          <label style={s.label}>Categoría *</label>
          <select style={s.select} value={form.categoria}
            onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
            {CATEGORIAS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            <div>
              <label style={s.label}>Cantidad *</label>
              <input style={s.input} type="number" min="1" value={form.cantidad}
                onChange={e=>setForm(f=>({...f,cantidad:e.target.value}))} required />
            </div>
            <div>
              <label style={s.label}>Costo unitario (Bs.) *</label>
              <input style={s.input} type="number" min="0" step="0.01" value={form.costo_unit}
                onChange={e=>setForm(f=>({...f,costo_unit:e.target.value}))}
                placeholder="0.00" required />
            </div>
          </div>

          {total > 0 && (
            <div style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:8,padding:'8px 14px',fontSize:13,color:'var(--danger)',marginBottom:12,display:'flex',justifyContent:'space-between'}}>
              <span>Total salida de caja</span>
              <strong>Bs. {total.toFixed(2)}</strong>
            </div>
          )}

          <label style={s.label}>Proveedor</label>
          <input style={s.input} value={form.proveedor}
            onChange={e=>setForm(f=>({...f,proveedor:e.target.value}))}
            placeholder="Nombre del proveedor..." />

          <label style={s.label}>Fecha *</label>
          <input style={s.input} type="date" value={form.fecha}
            onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} required />

          <label style={s.label}>Notas</label>
          <textarea style={{...s.input,resize:'vertical',minHeight:60}} value={form.notas}
            onChange={e=>setForm(f=>({...f,notas:e.target.value}))}
            placeholder="Observaciones adicionales..." />

          <div style={s.btnRow}>
            <button type="button" style={s.btnCancel} onClick={onClose}>Cancelar</button>
            <button type="submit" style={{...s.btnSave,opacity:saving?.6:1}} disabled={saving}>
              {saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Registrar salida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Compras() {
  const { token, esAdmin } = useAuthStore()
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [modalData, setModalData] = useState(null)
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [desde, setDesde] = useState(new Date().toISOString().slice(0,8)+'01')
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0,10))

  const load = useCallback(async () => {
    setLoading(true)
    const res = await api.listarCompras({ token, desde, hasta })
    if (res?.ok) setCompras(res.data || [])
    setLoading(false)
  }, [token, desde, hasta])

  useEffect(() => { load() }, [load])

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta compra?')) return
    const res = await api.eliminarCompra({ token, id })
    if (!res?.ok) { toast.error(res?.error || 'Error'); return }
    toast.success('Compra eliminada')
    load()
  }

  const filtradas = filtroCategoria ? compras.filter(c=>c.categoria===filtroCategoria) : compras
  const totalGasto = filtradas.reduce((a,c)=>a+c.costo_total,0)
  const porCategoria = CATEGORIAS.map(cat => ({
    ...cat,
    total: filtradas.filter(c=>c.categoria===cat.value).reduce((a,c)=>a+c.costo_total,0),
    count: filtradas.filter(c=>c.categoria===cat.value).length,
  })).filter(c=>c.count>0)

  return (
    <div style={s.shell}>
      <div style={s.header}>
        <div>
          <div style={s.title}>🛒 Compras y Consumibles</div>
          <div style={s.sub}>Control de salidas de caja — materiales y consumibles</div>
        </div>
        <button style={s.btnPrimary} onClick={()=>setModal('crear')}>
          <Plus size={14}/> Registrar compra
        </button>
      </div>

      {/* KPIs */}
      <div style={s.kpiGrid}>
        <div style={s.kpi('#ef4444')}>
          <div style={s.kpiVal('#ef4444')}>Bs. {totalGasto.toFixed(2)}</div>
          <div style={s.kpiLbl}>Total Gastado</div>
        </div>
        <div style={s.kpi('#f59e0b')}>
          <div style={s.kpiVal('#f59e0b')}>{filtradas.length}</div>
          <div style={s.kpiLbl}>Compras Registradas</div>
        </div>
        {porCategoria.map(cat=>(
          <div key={cat.value} style={s.kpi(cat.color)}>
            <div style={s.kpiVal(cat.color)}>Bs. {cat.total.toFixed(2)}</div>
            <div style={s.kpiLbl}>{cat.label} ({cat.count})</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={s.filterBar}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <label style={{fontSize:11,color:'var(--text-muted)'}}>Desde</label>
          <input type="date" style={{...s.filterSel}} value={desde} onChange={e=>setDesde(e.target.value)}/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <label style={{fontSize:11,color:'var(--text-muted)'}}>Hasta</label>
          <input type="date" style={{...s.filterSel}} value={hasta} onChange={e=>setHasta(e.target.value)}/>
        </div>
        <select style={s.filterSel} value={filtroCategoria} onChange={e=>setFiltroCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div style={s.card}>
        {loading
          ? <div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>Cargando...</div>
          : filtradas.length === 0
          ? <div style={{padding:40,textAlign:'center',color:'var(--text-muted)',fontSize:13}}>
              <TrendingDown size={32} style={{display:'block',margin:'0 auto 12px',opacity:.2}}/>
              No hay compras en este período
            </div>
          : <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    <th style={s.th}>Descripción</th>
                    <th style={s.th}>Categoría</th>
                    <th style={s.th}>Fecha</th>
                    <th style={s.th}>Proveedor</th>
                    <th style={{...s.th,textAlign:'right'}}>Cant.</th>
                    <th style={{...s.th,textAlign:'right'}}>Costo Unit.</th>
                    <th style={{...s.th,textAlign:'right'}}>Total</th>
                    {esAdmin() && <th style={s.th}></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map(c=>{
                    const cat = CATEGORIAS.find(x=>x.value===c.categoria)
                    return (
                      <tr key={c.id}>
                        <td style={{...s.td,fontWeight:500}}>
                          {c.descripcion}
                          {c.notas && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{c.notas}</div>}
                        </td>
                        <td style={s.td}>
                          <span style={s.badge(cat?.color||'#888')}>{cat?.label||c.categoria}</span>
                        </td>
                        <td style={{...s.td,color:'var(--text-soft)'}}>{c.fecha}</td>
                        <td style={{...s.td,color:'var(--text-soft)',fontSize:12}}>{c.proveedor||'—'}</td>
                        <td style={{...s.td,textAlign:'right'}}>{c.cantidad}</td>
                        <td style={{...s.td,textAlign:'right',color:'var(--text-soft)'}}>Bs. {parseFloat(c.costo_unit).toFixed(2)}</td>
                        <td style={s.tdNum}>Bs. {parseFloat(c.costo_total).toFixed(2)}</td>
                        {esAdmin() && (
                          <td style={s.td}>
                            <div style={{display:'flex',gap:5}}>
                              <button style={s.btnEdit} onClick={()=>{setModalData(c);setModal('editar')}}>
                                <Pencil size={12}/>
                              </button>
                              <button style={s.btnDanger} onClick={()=>handleEliminar(c.id)}>
                                <Trash2 size={12}/>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                  <tr>
                    <td colSpan={esAdmin()?6:5} style={{...s.td,fontWeight:700,textAlign:'right',color:'var(--text-muted)',fontSize:11}}>
                      TOTAL GASTADO
                    </td>
                    <td style={{...s.tdNum,fontSize:14}}>Bs. {totalGasto.toFixed(2)}</td>
                    {esAdmin() && <td style={s.td}/>}
                  </tr>
                </tbody>
              </table>
            </div>
        }
      </div>

      {(modal==='crear'||modal==='editar') && (
        <ModalCompra
          token={token}
          compra={modal==='editar' ? modalData : null}
          onClose={()=>{setModal(null);setModalData(null)}}
          onSaved={()=>{setModal(null);setModalData(null);load()}}
        />
      )}
    </div>
  )
}
