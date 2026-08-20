import React, { useState, useCallback } from 'react'
import { FileText, TrendingUp, Users, Package, Wrench, BarChart2, RefreshCw, FileSpreadsheet, ChevronDown, UserCheck } from 'lucide-react'
import { api } from '../lib/apiClient'
import useAuthStore from '../store/authStore'
import {
  exportPDFResumen, exportPDFMecanicos, exportPDFInsumos,
  exportPDFExternos, exportPDFCards, exportExcelCompleto,
  exportExcelResumen, exportExcelCards, exportPDFClientes,
  exportExcelClientes, exportExcelMecanicos, exportExcelInsumos, exportExcelExternos,
} from '../lib/exportLib'
import toast from 'react-hot-toast'

const s = {
  shell: { padding:'24px 20px', maxWidth:1100, margin:'0 auto' },
  header: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 },
  title: { fontSize:22, fontWeight:'bold', color:'var(--text-strong)' },
  sub: { fontSize:12, color:'var(--text-muted)', marginTop:3 },
  filterCard: { background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 20px', marginBottom:20, display:'flex', alignItems:'flex-end', gap:14, flexWrap:'wrap' },
  label: { display:'block', fontSize:11, fontWeight:600, color:'var(--text-muted)', marginBottom:5, letterSpacing:'.4px', textTransform:'uppercase' },
  input: { background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontSize:13, minWidth:140 },
  btnPrimary: { display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:13, fontWeight:600, cursor:'pointer' },
  btnGhost: { display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-soft)', fontSize:12, cursor:'pointer' },
  btnPDF: { display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:7, border:'1px solid #ef444444', background:'rgba(239,68,68,.08)', color:'#ef4444', fontSize:12, fontWeight:600, cursor:'pointer' },
  btnXLS: { display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:7, border:'1px solid #10b98144', background:'rgba(16,185,129,.08)', color:'#10b981', fontSize:12, fontWeight:600, cursor:'pointer' },
  section: { background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, marginBottom:18, overflow:'hidden' },
  sectionHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--bg)', cursor:'pointer' },
  sectionTitle: { display:'flex', alignItems:'center', gap:8, fontSize:14, fontWeight:700, color:'var(--text-strong)' },
  sectionBody: { padding:'20px' },
  kpiGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:12, marginBottom:20 },
  kpi: (c) => ({ background:`${c}14`, border:`1px solid ${c}33`, borderRadius:10, padding:'14px 16px' }),
  kpiVal: (c) => ({ fontSize:20, fontWeight:'bold', color:c, marginBottom:4 }),
  kpiLbl: { fontSize:11, color:'var(--text-muted)' },
  table: { width:'100%', borderCollapse:'collapse', fontSize:13 },
  th: { padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:'.6px', textTransform:'uppercase', color:'var(--text-muted)', borderBottom:'2px solid var(--border)', background:'var(--bg)' },
  td: { padding:'10px 12px', borderBottom:'1px solid var(--divider)', color:'var(--text)', verticalAlign:'middle' },
  tdNum: { padding:'10px 12px', borderBottom:'1px solid var(--divider)', color:'var(--accent)', fontWeight:600, textAlign:'right', verticalAlign:'middle' },
  badge: (c) => ({ display:'inline-block', padding:'2px 8px', borderRadius:9999, fontSize:10, fontWeight:700, background:`${c}22`, color:c }),
  exportRow: { display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 },
  noData: { padding:'40px 0', textAlign:'center', color:'var(--text-muted)', fontSize:13 },
}

const bs = (n) => `Bs. ${Number(n||0).toFixed(2)}`
const SL = { MANTENIMIENTO_BASICO:'Mant. Básico', MANTENIMIENTO_COMPLETO:'Mant. Completo', CAMBIO_ACEITE:'Cambio Aceite', REPARACION_TELESCOPIO:'Rep. Telescopio' }
const EC = { NUEVO:'#3b82f6', EN_CURSO:'#f59e0b', PAUSADO:'#8b5cf6', TERMINADO:'#10b981', PRUEBAS:'#06b6d4', FINALIZADO:'#6b7280' }
const SC = { MANTENIMIENTO_BASICO:'#3b82f6', MANTENIMIENTO_COMPLETO:'#f59e0b', CAMBIO_ACEITE:'#10b981', REPARACION_TELESCOPIO:'#8b5cf6' }

function Seccion({ icon: Icon, titulo, color, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={s.section}>
      <div style={s.sectionHeader} onClick={() => setOpen(v => !v)}>
        <div style={s.sectionTitle}><Icon size={16} color={color} />{titulo}</div>
        <ChevronDown size={16} color="var(--text-muted)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform .2s' }} />
      </div>
      {open && <div style={s.sectionBody}>{children}</div>}
    </div>
  )
}

function KPI({ label, valor, color = '#f59e0b', small }) {
  return (
    <div style={s.kpi(color)}>
      <div style={{ ...s.kpiVal(color), fontSize: small ? 15 : 20 }}>{valor}</div>
      <div style={s.kpiLbl}>{label}</div>
    </div>
  )
}

function MiniBar({ pct, color }) {
  return (
    <div style={{ height:6, borderRadius:3, background:`${color}25`, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:color, borderRadius:3 }} />
    </div>
  )
}

function MechanicosConDetalle({ mecanicos }) {
  const [expanded, setExpanded] = useState(null)
  const SL = { MANTENIMIENTO_BASICO:'Mant. Básico', MANTENIMIENTO_COMPLETO:'Mant. Completo', CAMBIO_ACEITE:'Cambio Aceite', REPARACION_TELESCOPIO:'Rep. Telescopio' }

  return (
    <div>
      <div style={{ overflowX:'auto' }}>
        <table style={s.table}>
          <thead><tr>
            <th style={s.th}>Mecanico</th>
            <th style={s.th}>Tipo Sueldo</th>
            <th style={{ ...s.th, textAlign:'right' }}>Asignadas</th>
            <th style={{ ...s.th, textAlign:'right' }}>Finalizadas</th>
            <th style={{ ...s.th, textAlign:'right' }}>Servicios</th>
            <th style={{ ...s.th, textAlign:'right' }}>Reemplazos</th>
            <th style={{ ...s.th, textAlign:'right' }}>Externos</th>
            <th style={{ ...s.th, textAlign:'right' }}>Costo</th>
            <th style={{ ...s.th, textAlign:'right' }}>Margen</th>
            <th style={{ ...s.th, textAlign:'right' }}>Total</th>
            <th style={s.th}></th>
          </tr></thead>
          <tbody>
            {mecanicos.map(m => (
              <React.Fragment key={m.id}>
                <tr style={{ cursor: m.detalle?.length ? 'pointer' : 'default' }}
                    onClick={() => m.detalle?.length && setExpanded(expanded === m.id ? null : m.id)}>
                  <td style={{ ...s.td, fontWeight:600 }}>{m.nombre}</td>
                  <td style={s.td}><span style={s.badge(m.tipo_sueldo==='FIJO'?'#10b981':'#8b5cf6')}>{m.tipo_sueldo||'--'}</span></td>
                  <td style={{ ...s.td, textAlign:'right' }}>{m.cards_asignadas}</td>
                  <td style={{ ...s.td, textAlign:'right' }}>{m.cards_finalizadas}</td>
                  <td style={s.tdNum}>{bs(m.total_servicios)}</td>
                  <td style={s.tdNum}>{bs(m.total_reemplazos)}</td>
                  <td style={s.tdNum}>{bs(m.total_ext)}</td>
                  <td style={{ ...s.td, textAlign:'right', color:'var(--danger)' }}>{bs(m.costo_total||0)}</td>
                  <td style={{ ...s.td, textAlign:'right' }}>
                    <span style={s.badge((m.margen_pct||0)>=40?'#10b981':(m.margen_pct||0)>=20?'#f59e0b':'#ef4444')}>{m.margen_pct||0}%</span>
                    <span style={{ fontSize:10, color:'var(--text-muted)', marginLeft:4 }}>{bs(m.margen||0)}</span>
                  </td>
                  <td style={{ ...s.tdNum, fontSize:14 }}>{bs(m.total_facturado)}</td>
                  <td style={{ ...s.td, textAlign:'center' }}>
                    {m.detalle?.length > 0 && <ChevronDown size={14} color="var(--text-muted)" style={{ transform: expanded===m.id ? 'rotate(180deg)' : 'none', transition:'transform .2s' }} />}
                  </td>
                </tr>
                {expanded === m.id && m.detalle?.length > 0 && (
                  <tr><td colSpan={11} style={{ padding:0, background:'var(--bg)' }}>
                    <div style={{ padding:'12px 20px' }}>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.5px', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8 }}>Detalle por orden</div>
                      <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead><tr>
                          <th style={{ ...s.th, fontSize:9 }}>Cliente</th>
                          <th style={{ ...s.th, fontSize:9 }}>Fecha</th>
                          <th style={{ ...s.th, fontSize:9 }}>Servicio</th>
                          <th style={{ ...s.th, fontSize:9, textAlign:'right' }}>Servicios</th>
                          <th style={{ ...s.th, fontSize:9, textAlign:'right' }}>Reemplazos</th>
                          <th style={{ ...s.th, fontSize:9, textAlign:'right' }}>Externos</th>
                          <th style={{ ...s.th, fontSize:9, textAlign:'right' }}>Costo</th>
                          <th style={{ ...s.th, fontSize:9, textAlign:'right' }}>Total</th>
                        </tr></thead>
                        <tbody>
                          {m.detalle.map((d, i) => (
                            <tr key={i}>
                              <td style={{ ...s.td, fontSize:11 }}>{d.cliente_nombre}</td>
                              <td style={{ ...s.td, fontSize:11, color:'var(--text-soft)' }}>{d.fecha}</td>
                              <td style={{ ...s.td, fontSize:11 }}>{Array.isArray(d.tipo_servicio) ? d.tipo_servicio.map(t=>SL[t]||t).join(', ') : (SL[d.tipo_servicio]||d.tipo_servicio)}</td>
                              <td style={{ ...s.tdNum, fontSize:11 }}>{bs(d.total_servicios)}</td>
                              <td style={{ ...s.tdNum, fontSize:11 }}>{bs(d.total_reemplazos)}</td>
                              <td style={{ ...s.tdNum, fontSize:11 }}>{bs(d.total_externos)}</td>
                              <td style={{ ...s.td, fontSize:11, textAlign:'right', color:'var(--danger)' }}>{bs(d.costo)}</td>
                              <td style={{ ...s.tdNum, fontSize:11, fontWeight:600 }}>{bs(d.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Reportes() {
  const { token } = useAuthStore()
  const hoy = new Date().toISOString().slice(0, 10)
  const primeroDeMes = hoy.slice(0, 8) + '01'

  const [periodo, setPeriodo] = useState({ desde: primeroDeMes, hasta: hoy })
  const [data, setData] = useState(null)
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    toast.loading('Cargando reportes...', { id: 'loading-rep' })
    const [r1, r2, r3, r4, r5, r6] = await Promise.all([
      api.reporteResumen({ token, ...periodo }),
      api.reporteMecanicos({ token, ...periodo }),
      api.reporteInsumos({ token, ...periodo }),
      api.reporteExternos({ token, ...periodo }),
      api.reporteCards({ token, ...periodo }),
      api.reporteClientes({ token, ...periodo }),
    ])
    toast.dismiss('loading-rep')
    setLoading(false)
    if (!r1.ok) { toast.error('Error cargando reportes'); return }
    setClientes(r6.data || [])
    setData({
      resumen:   r1.data,
      mecanicos: r2.data || [],
      insumos:   r3.data || [],
      externos:  r4.data || { lista:[], total_ingresos:0, total_costos:0, margen_total:0 },
      cards:     r5.data || [],
    })
    toast.success('Reportes actualizados')
  }, [token, periodo])

  const handleExcelCompleto = async () => {
    if (!data) return
    setExporting(true)
    try { exportExcelCompleto({ ...data, clientes, periodo }); toast.success('Excel exportado') }
    catch { toast.error('Error exportando Excel') }
    setExporting(false)
  }

  const periodoOpts = [
    { label:'Este mes',        desde: primeroDeMes, hasta: hoy },
    { label:'Últimos 3 meses', desde: new Date(Date.now()-90*86400000).toISOString().slice(0,10), hasta: hoy },
    { label:'Este año',        desde: `${hoy.slice(0,4)}-01-01`, hasta: hoy },
    { label:'Todo',            desde: '2000-01-01', hasta: hoy },
  ]

  return (
    <div style={s.shell}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Reportes</div>
          <div style={s.sub}>Ingresos, mecanicos, insumos y mas — exportacion PDF y Excel</div>
        </div>
        {data && (
          <button style={{ ...s.btnGhost, color:'#10b981', border:'1px solid #10b98144' }}
            onClick={handleExcelCompleto} disabled={exporting}>
            <FileSpreadsheet size={14} />
            {exporting ? 'Exportando...' : 'Exportar TODO a Excel'}
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={s.filterCard}>
        <div>
          <label style={s.label}>Desde</label>
          <input type="date" style={s.input} value={periodo.desde}
            onChange={e => setPeriodo(p => ({ ...p, desde: e.target.value }))} />
        </div>
        <div>
          <label style={s.label}>Hasta</label>
          <input type="date" style={s.input} value={periodo.hasta}
            onChange={e => setPeriodo(p => ({ ...p, hasta: e.target.value }))} />
        </div>
        {periodoOpts.map(opt => (
          <button key={opt.label} onClick={() => setPeriodo({ desde: opt.desde, hasta: opt.hasta })}
            style={{ ...s.btnGhost, fontSize:11, padding:'7px 12px',
              ...(periodo.desde===opt.desde && periodo.hasta===opt.hasta
                ? { background:'var(--accent-weak)', color:'var(--accent)', border:'1px solid var(--accent)' }
                : {}) }}>
            {opt.label}
          </button>
        ))}
        <button style={s.btnPrimary} onClick={cargar} disabled={loading}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Cargando...' : 'Generar reportes'}
        </button>
      </div>

      {!data && (
        <div style={{ textAlign:'center', padding:'80px 20px', color:'var(--text-muted)' }}>
          <BarChart2 size={48} style={{ display:'block', margin:'0 auto 16px', opacity:.2 }} />
          <div style={{ fontSize:15, marginBottom:12 }}>Selecciona un periodo y genera los reportes</div>
          <button style={s.btnPrimary} onClick={cargar}>Generar ahora</button>
        </div>
      )}

      {data && (
        <div>

          {/* 1. RESUMEN */}
          <Seccion icon={TrendingUp} titulo="Resumen General de Ingresos" color="#f59e0b">
            <div style={s.exportRow}>
              <button style={s.btnPDF} onClick={() => exportPDFResumen(data.resumen)}>
                <FileText size={13} /> PDF
              </button>
              <button style={s.btnXLS} onClick={() => exportExcelResumen({ ...data.resumen, periodo })}>
                <FileSpreadsheet size={13} /> Excel
              </button>
            </div>
            <div style={s.kpiGrid}>
              <KPI label="Ingreso Total"     valor={bs(data.resumen.totales.ingreso_total)}     color="#f59e0b" />
              <KPI label="Costo Total"       valor={bs(data.resumen.totales.costo_total)}       color="#ef4444" />
              <KPI label="Margen Bruto"      valor={bs(data.resumen.totales.margen_bruto)}      color="#10b981" />
              <KPI label="Cards Totales"     valor={data.resumen.totales.cards_total}           color="#3b82f6" />
              <KPI label="Finalizadas"       valor={data.resumen.totales.cards_finalizadas}     color="#10b981" small />
              <KPI label="Ing. Servicios"    valor={bs(data.resumen.totales.ingreso_servicios)} color="#8b5cf6" small />
              <KPI label="Ing. Reemplazos"   valor={bs(data.resumen.totales.ingreso_reemplazos)} color="#06b6d4" small />
              <KPI label="Ing. Externos"     valor={bs(data.resumen.totales.ingreso_externos)}  color="#f97316" small />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:10, letterSpacing:'.6px', textTransform:'uppercase' }}>Ingresos por Mes</div>
                {data.resumen.por_mes.length === 0
                  ? <div style={s.noData}>Sin datos</div>
                  : <table style={s.table}>
                      <thead><tr>
                        <th style={s.th}>Mes</th>
                        <th style={{ ...s.th, textAlign:'right' }}>Ordenes</th>
                        <th style={{ ...s.th, textAlign:'right' }}>Ingreso</th>
                      </tr></thead>
                      <tbody>
                        {data.resumen.por_mes.map(m => (
                          <tr key={m.mes}>
                            <td style={s.td}>{m.mes}</td>
                            <td style={{ ...s.td, textAlign:'right' }}>{m.cantidad}</td>
                            <td style={s.tdNum}>{bs(m.ingreso)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                }
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:10, letterSpacing:'.6px', textTransform:'uppercase' }}>Por Tipo de Servicio</div>
                {Object.entries(data.resumen.por_servicio).map(([k, v]) => {
                  const color = SC[k] || '#888'
                  const pct = data.resumen.totales.ingreso_total > 0 ? Math.round(v.ingreso / data.resumen.totales.ingreso_total * 100) : 0
                  return (
                    <div key={k} style={{ marginBottom:12 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:12, color:'var(--text)' }}>{SL[k]||k}</span>
                        <span style={{ fontSize:12, fontWeight:700, color }}>{bs(v.ingreso)} <span style={{ fontSize:10, color:'var(--text-muted)' }}>({pct}%)</span></span>
                      </div>
                      <MiniBar pct={pct} color={color} />
                    </div>
                  )
                })}
                <div style={{ marginTop:20 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:10, letterSpacing:'.6px', textTransform:'uppercase' }}>Cards por Estado</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {Object.entries(data.resumen.por_estado).map(([k, v]) => (
                      <span key={k} style={s.badge(EC[k]||'#888')}>{k.replace('_',' ')}: {v}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Seccion>

          {/* 2. MECANICOS */}
          <Seccion icon={Users} titulo="Ingresos por Mecanico" color="#3b82f6">
            <div style={s.exportRow}>
              <button style={s.btnPDF} onClick={() => exportPDFMecanicos(data.mecanicos, periodo)}>
                <FileText size={13} /> PDF
              </button>
              <button style={s.btnXLS} onClick={() => exportExcelMecanicos(data.mecanicos, periodo)}>
                <FileSpreadsheet size={13} /> Excel
              </button>
            </div>
            {/* KPIs globales */}
            <div style={s.kpiGrid}>
              <KPI label="Ingreso Total" valor={bs(data.mecanicos.reduce((a,m)=>a+m.total_facturado,0))} color="#3b82f6" />
              <KPI label="Costo Total"   valor={bs(data.mecanicos.reduce((a,m)=>a+(m.costo_total||0),0))} color="#ef4444" />
              <KPI label="Margen Total"  valor={bs(data.mecanicos.reduce((a,m)=>a+(m.margen||0),0))} color="#10b981" />
              <KPI label="Mecanicos"     valor={data.mecanicos.length} color="#8b5cf6" small />
            </div>
            {data.mecanicos.length === 0
              ? <div style={s.noData}>Sin mecanicos</div>
              : <MechanicosConDetalle mecanicos={data.mecanicos} />
            }
          </Seccion>

          {/* 3. INSUMOS */}
          <Seccion icon={Package} titulo="Inventario / Reemplazos más Usados" color="#06b6d4" defaultOpen={false}>
            <div style={s.exportRow}>
              <button style={s.btnPDF} onClick={() => exportPDFInsumos(data.insumos, periodo)}>
                <FileText size={13} /> PDF
              </button>
              <button style={s.btnXLS} onClick={() => exportExcelInsumos(data.insumos, periodo)}>
                <FileSpreadsheet size={13} /> Excel
              </button>
            </div>
            {data.insumos.length === 0
              ? <div style={s.noData}>Sin insumos en este periodo</div>
              : <table style={s.table}>
                  <thead><tr>
                    <th style={{ ...s.th, width:30 }}>#</th>
                    <th style={s.th}>Insumo</th>
                    <th style={{ ...s.th, textAlign:'right' }}>Veces</th>
                    <th style={{ ...s.th, textAlign:'right' }}>Cantidad</th>
                    <th style={{ ...s.th, textAlign:'right' }}>Ingreso</th>
                    <th style={{ ...s.th, textAlign:'right' }}>% Total</th>
                  </tr></thead>
                  <tbody>
                    {data.insumos.map((ins, i) => {
                      const total = data.insumos.reduce((a,x)=>a+x.ingreso_total,0)
                      const pct = total > 0 ? Math.round(ins.ingreso_total/total*100) : 0
                      return (
                        <tr key={ins.nombre}>
                          <td style={{ ...s.td, color:'var(--text-muted)', fontSize:11 }}>{i+1}</td>
                          <td style={s.td}>{ins.nombre}</td>
                          <td style={{ ...s.td, textAlign:'right' }}>{ins.veces_usado}</td>
                          <td style={{ ...s.td, textAlign:'right' }}>{ins.cantidad_total}</td>
                          <td style={s.tdNum}>{bs(ins.ingreso_total)}</td>
                          <td style={{ ...s.td, textAlign:'right' }}>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6 }}>
                              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{pct}%</span>
                              <div style={{ width:50, height:5, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                                <div style={{ width:`${pct}%`, height:'100%', background:'#06b6d4', borderRadius:3 }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
            }
          </Seccion>

          {/* 4. EXTERNOS */}
          <Seccion icon={Wrench} titulo="Trabajos Externos — Margen" color="#f97316" defaultOpen={false}>
            <div style={s.exportRow}>
              <button style={s.btnPDF} onClick={() => exportPDFExternos(data.externos, periodo)}>
                <FileText size={13} /> PDF
              </button>
              <button style={s.btnXLS} onClick={() => exportExcelExternos(data.externos, periodo)}>
                <FileSpreadsheet size={13} /> Excel
              </button>
            </div>
            <div style={s.kpiGrid}>
              <KPI label="Total Ingresos" valor={bs(data.externos.total_ingresos)} color="#f97316" />
              <KPI label="Total Costos"   valor={bs(data.externos.total_costos)}   color="#ef4444" />
              <KPI label="Margen Total"   valor={bs(data.externos.margen_total)}   color="#10b981" />
              <KPI label="Cantidad"       valor={data.externos.lista.length}        color="#8b5cf6" small />
            </div>
            {data.externos.lista.length === 0
              ? <div style={s.noData}>Sin trabajos externos</div>
              : <table style={s.table}>
                  <thead><tr>
                    <th style={s.th}>Detalle</th>
                    <th style={{ ...s.th, textAlign:'right' }}>Precio</th>
                    <th style={{ ...s.th, textAlign:'right' }}>Costo</th>
                    <th style={{ ...s.th, textAlign:'right' }}>Margen</th>
                    <th style={{ ...s.th, textAlign:'right' }}>Margen %</th>
                    <th style={s.th}>Card</th>
                  </tr></thead>
                  <tbody>
                    {data.externos.lista.map((t, i) => (
                      <tr key={i}>
                        <td style={s.td}>{t.detalle}</td>
                        <td style={s.tdNum}>{bs(t.precio_final)}</td>
                        <td style={{ ...s.td, textAlign:'right', color:'var(--danger)' }}>{bs(t.costo)}</td>
                        <td style={{ ...s.tdNum, color: t.margen>=0?'#10b981':'#ef4444' }}>{bs(t.margen)}</td>
                        <td style={{ ...s.td, textAlign:'right' }}>
                          <span style={s.badge(t.margen_pct>=40?'#10b981':t.margen_pct>=20?'#f59e0b':'#ef4444')}>{t.margen_pct}%</span>
                        </td>
                        <td style={{ ...s.td, color:'var(--text-muted)', fontSize:11 }}>#{t.card_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </Seccion>

          {/* 5. ORDENES */}
          <Seccion icon={FileText} titulo="Listado Completo de Ordenes" color="#8b5cf6" defaultOpen={false}>
            <div style={s.exportRow}>
              <button style={s.btnPDF} onClick={() => exportPDFCards(data.cards, periodo)}>
                <FileText size={13} /> PDF
              </button>
              <button style={s.btnXLS} onClick={() => exportExcelCards(data.cards, periodo)}>
                <FileSpreadsheet size={13} /> Excel
              </button>
            </div>
            <div style={s.kpiGrid}>
              <KPI label="Total Ordenes"    valor={data.cards.length}                                  color="#8b5cf6" small />
              <KPI label="Facturacion Total" valor={bs(data.cards.reduce((a,c)=>a+c.total,0))}         color="#f59e0b" small />
            </div>
            {data.cards.length === 0
              ? <div style={s.noData}>Sin ordenes en este periodo</div>
              : <div style={{ overflowX:'auto' }}>
                  <table style={s.table}>
                    <thead><tr>
                      <th style={s.th}>#</th>
                      <th style={s.th}>Cliente</th>
                      <th style={s.th}>Fecha</th>
                      <th style={s.th}>Servicio</th>
                      <th style={s.th}>Estado</th>
                      <th style={s.th}>Mecanico</th>
                      <th style={{ ...s.th, textAlign:'right' }}>Serv.</th>
                      <th style={{ ...s.th, textAlign:'right' }}>Remp.</th>
                      <th style={{ ...s.th, textAlign:'right' }}>Ext.</th>
                      <th style={{ ...s.th, textAlign:'right' }}>Total</th>
                    </tr></thead>
                    <tbody>
                      {data.cards.map(c => (
                        <tr key={c.id}>
                          <td style={{ ...s.td, color:'var(--text-muted)', fontSize:11 }}>#{c.id}</td>
                          <td style={{ ...s.td, fontWeight:600 }}>{c.cliente_nombre}</td>
                          <td style={{ ...s.td, color:'var(--text-soft)' }}>{c.fecha}</td>
                          <td style={{ ...s.td, fontSize:11 }}>{SL[c.tipo_servicio]||c.tipo_servicio}</td>
                          <td style={s.td}><span style={s.badge(EC[c.estado]||'#888')}>{c.estado.replace('_',' ')}</span></td>
                          <td style={{ ...s.td, fontSize:12 }}>{c.mecanico}</td>
                          <td style={{ ...s.td, textAlign:'right', fontSize:12 }}>{bs(c.total_servicios||0)}</td>
                          <td style={{ ...s.td, textAlign:'right', fontSize:12 }}>{bs(c.total_reemplazos)}</td>
                          <td style={{ ...s.td, textAlign:'right', fontSize:12 }}>{bs(c.total_externos)}</td>
                          <td style={s.tdNum}>{bs(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </Seccion>

          {/* 6. CLIENTES */}
          <Seccion icon={UserCheck} titulo="Clientes — Frecuencia y Gasto" color="#10b981" defaultOpen={false}>
            <div style={s.exportRow}>
              <button style={s.btnPDF} onClick={() => exportPDFClientes(clientes, periodo)}>
                <FileText size={13} /> PDF
              </button>
              <button style={s.btnXLS} onClick={() => exportExcelClientes(clientes, periodo)}>
                <FileSpreadsheet size={13} /> Excel
              </button>
            </div>
            <div style={s.kpiGrid}>
              <KPI label="Clientes Unicos"   valor={clientes.length}                                                                             color="#10b981" small />
              <KPI label="Total Facturado"   valor={bs(clientes.reduce((a,c)=>a+c.total_gastado,0))}                                             color="#f59e0b" small />
              <KPI label="Ticket Promedio"   valor={bs(clientes.length>0?clientes.reduce((a,c)=>a+c.total_gastado,0)/clientes.length:0)}          color="#3b82f6" small />
            </div>
            {clientes.length === 0
              ? <div style={s.noData}>Sin clientes en este periodo</div>
              : <table style={s.table}>
                  <thead><tr>
                    <th style={{ ...s.th, width:30 }}>#</th>
                    <th style={s.th}>Cliente</th>
                    <th style={s.th}>Telefono</th>
                    <th style={{ ...s.th, textAlign:'right' }}>Visitas</th>
                    <th style={{ ...s.th, textAlign:'right' }}>Total Gastado</th>
                    <th style={{ ...s.th, textAlign:'right' }}>Ticket Prom.</th>
                  </tr></thead>
                  <tbody>
                    {clientes.map((c, i) => (
                      <tr key={i}>
                        <td style={{ ...s.td, color:'var(--text-muted)', fontSize:11 }}>{i+1}</td>
                        <td style={{ ...s.td, fontWeight:600 }}>{c.cliente_nombre}</td>
                        <td style={{ ...s.td, color:'var(--text-soft)' }}>{c.cliente_telefono || '--'}</td>
                        <td style={{ ...s.td, textAlign:'right' }}>
                          <span style={s.badge(c.visitas>2?'#10b981':'#3b82f6')}>{c.visitas}x</span>
                        </td>
                        <td style={s.tdNum}>{bs(c.total_gastado)}</td>
                        <td style={{ ...s.td, textAlign:'right', color:'var(--text-soft)', fontSize:12 }}>
                          {bs(c.visitas>0?c.total_gastado/c.visitas:0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </Seccion>

        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
