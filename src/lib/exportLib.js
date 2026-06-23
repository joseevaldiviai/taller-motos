import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// ── helpers ────────────────────────────────────────────────────
const bs = (n) => `Bs. ${Number(n || 0).toFixed(2)}`
const pct = (n) => `${n}%`
const hoy = () => new Date().toLocaleDateString('es-BO')

const SERVICIOS_LABEL = {
  MANTENIMIENTO_BASICO:   'Mant. Básico',
  MANTENIMIENTO_COMPLETO: 'Mant. Completo',
  CAMBIO_ACEITE:          'Cambio Aceite',
  REPARACION_TELESCOPIO:  'Rep. Telescopio',
}
const ESTADOS_LABEL = {
  NUEVO:'Nuevo', EN_CURSO:'En Curso', PAUSADO:'Pausado',
  TERMINADO:'Terminado', PRUEBAS:'Pruebas', FINALIZADO:'Finalizado',
}

// ── PDF base ───────────────────────────────────────────────────
function crearPDF(titulo, subtitulo = '') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Header
  doc.setFillColor(15, 29, 41)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(245, 158, 11)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('🏍️  TALLER MOTOS', 14, 12)
  doc.setTextColor(200, 210, 220)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema de Gestión', 14, 19)
  doc.setTextColor(150, 165, 175)
  doc.setFontSize(8)
  doc.text(`Generado: ${hoy()}`, 150, 19, { align: 'right' })

  // Título del reporte
  doc.setTextColor(30, 40, 50)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, 14, 38)
  if (subtitulo) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 115, 125)
    doc.text(subtitulo, 14, 44)
  }

  return doc
}

function tabla(doc, head, body, startY, opts = {}) {
  autoTable(doc, {
    startY,
    head: [head],
    body,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [30, 40, 50],
      lineColor: [200, 210, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 29, 41],
      textColor: [245, 158, 11],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: opts.columnStyles || {},
    margin: { left: 14, right: 14 },
    ...opts,
  })
  return doc.lastAutoTable.finalY + 6
}

function kpiBox(doc, items, startY) {
  const cols = items.length
  const w    = (210 - 28) / cols
  items.forEach((item, i) => {
    const x = 14 + i * w
    doc.setFillColor(240, 245, 252)
    doc.setDrawColor(200, 210, 220)
    doc.roundedRect(x, startY, w - 2, 18, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(245, 158, 11)
    doc.text(String(item.valor), x + (w-2)/2, startY + 9, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 115, 125)
    doc.text(item.label, x + (w-2)/2, startY + 15, { align: 'center' })
  })
  return startY + 24
}

// ── EXPORT PDF: Resumen General ────────────────────────────────
export function exportPDFResumen(data) {
  const { periodo, totales, por_servicio, por_estado, por_mes } = data
  const doc = crearPDF(
    'Reporte de Ingresos — Resumen General',
    `Período: ${periodo.desde}  →  ${periodo.hasta}`
  )

  let y = 50

  // KPIs principales
  y = kpiBox(doc, [
    { label: 'Ingreso Total', valor: bs(totales.ingreso_total) },
    { label: 'Costo Total',   valor: bs(totales.costo_total) },
    { label: 'Margen Bruto',  valor: bs(totales.margen_bruto) },
    { label: 'Cards Finalizadas', valor: totales.cards_finalizadas },
  ], y)

  y = kpiBox(doc, [
    { label: 'Servicios', valor: bs(totales.ingreso_servicios) },
    { label: 'Reemplazos', valor: bs(totales.ingreso_reemplazos) },
    { label: 'Externos',  valor: bs(totales.ingreso_externos) },
    { label: 'Total Cards', valor: totales.cards_total },
  ], y)

  y += 4

  // Ingresos por mes
  if (por_mes.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 40, 50)
    doc.text('Ingresos por Mes', 14, y)
    y += 4
    y = tabla(doc,
      ['Mes', 'Órdenes Finalizadas', 'Ingreso Total'],
      por_mes.map(m => [m.mes, m.cantidad, bs(m.ingreso)]),
      y,
      { columnStyles: { 2: { halign: 'right' } } }
    )
  }

  // Por tipo de servicio
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 40, 50)
  doc.text('Por Tipo de Servicio', 14, y)
  y += 4
  y = tabla(doc,
    ['Servicio', 'Cantidad', 'Ingreso Total', '% del Total'],
    Object.entries(por_servicio).map(([k, v]) => [
      SERVICIOS_LABEL[k] || k,
      v.cantidad,
      bs(v.ingreso),
      pct(totales.ingreso_total > 0 ? Math.round(v.ingreso / totales.ingreso_total * 100) : 0),
    ]),
    y,
    { columnStyles: { 2: { halign:'right' }, 3: { halign:'right' } } }
  )

  // Por estado
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 40, 50)
  doc.text('Cards por Estado', 14, y)
  y += 4
  tabla(doc,
    ['Estado', 'Cantidad'],
    Object.entries(por_estado).map(([k, v]) => [ESTADOS_LABEL[k] || k, v]),
    y
  )

  doc.save(`reporte-resumen-${periodo.desde}-${periodo.hasta}.pdf`)
}

// ── EXPORT PDF: Mecánicos ──────────────────────────────────────
export function exportPDFMecanicos(data, periodo) {
  const doc = crearPDF(
    'Reporte de Mecánicos',
    `Período: ${periodo.desde}  →  ${periodo.hasta}`
  )
  let y = 50

  // Resumen global
  y = tabla(doc,
    ['Mecánico', 'Tipo Sueldo', 'Asignadas', 'Finalizadas', 'Servicios', 'Reemplazos', 'Externos', 'Total Facturado'],
    data.map(m => [
      m.nombre, m.tipo_sueldo || '—', m.cards_asignadas, m.cards_finalizadas,
      bs(m.total_servicios), bs(m.total_reemplazos), bs(m.total_ext), bs(m.total_facturado),
    ]),
    y,
    { columnStyles: { 7: { halign:'right', fontStyle:'bold' } } }
  )

  // Detalle por mecánico
  data.forEach(m => {
    if (!m.detalle?.length) return
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 40, 50)
    doc.text(`Detalle — ${m.nombre}`, 14, y)
    y += 3
    y = tabla(doc,
      ['Cliente', 'Fecha', 'Servicio', 'Total'],
      m.detalle.map(d => [
        d.cliente_nombre, d.fecha, SERVICIOS_LABEL[d.tipo_servicio] || d.tipo_servicio, bs(d.total),
      ]),
      y,
      { columnStyles: { 3: { halign:'right' } }, styles: { fontSize: 7 } }
    )
  })

  doc.save(`reporte-mecanicos-${periodo.desde}-${periodo.hasta}.pdf`)
}

// ── EXPORT PDF: Insumos ────────────────────────────────────────
export function exportPDFInsumos(data, periodo) {
  const doc = crearPDF(
    'Reporte de Insumos / Reemplazos',
    `Período: ${periodo.desde}  →  ${periodo.hasta}`
  )
  const total = data.reduce((a, i) => a + i.ingreso_total, 0)
  let y = 50
  y = kpiBox(doc, [
    { label: 'Total Insumos Distintos', valor: data.length },
    { label: 'Ingreso Total Reemplazos', valor: bs(total) },
  ], y)
  y += 2
  tabla(doc,
    ['Insumo / Repuesto', 'Veces Usado', 'Cant. Total', 'Ingreso Total', '% del Total'],
    data.map(i => [
      i.nombre, i.veces_usado, i.cantidad_total, bs(i.ingreso_total),
      pct(total > 0 ? Math.round(i.ingreso_total / total * 100) : 0),
    ]),
    y,
    { columnStyles: { 3: { halign:'right' }, 4: { halign:'right' } } }
  )
  doc.save(`reporte-insumos-${periodo.desde}-${periodo.hasta}.pdf`)
}

// ── EXPORT PDF: Trabajos Externos ──────────────────────────────
export function exportPDFExternos(data, periodo) {
  const { lista, total_ingresos, total_costos, margen_total } = data
  const doc = crearPDF(
    'Reporte de Trabajos Externos',
    `Período: ${periodo.desde}  →  ${periodo.hasta}`
  )
  let y = 50
  y = kpiBox(doc, [
    { label: 'Total Ingresos', valor: bs(total_ingresos) },
    { label: 'Total Costos',   valor: bs(total_costos) },
    { label: 'Margen Total',   valor: bs(margen_total) },
    { label: 'Qty Trabajos',   valor: lista.length },
  ], y)
  y += 2
  tabla(doc,
    ['Detalle', 'Precio Final', 'Costo', 'Margen', 'Margen %'],
    lista.map(t => [t.detalle, bs(t.precio_final), bs(t.costo), bs(t.margen), pct(t.margen_pct)]),
    y,
    { columnStyles: { 1:{halign:'right'}, 2:{halign:'right'}, 3:{halign:'right'}, 4:{halign:'right'} } }
  )
  doc.save(`reporte-externos-${periodo.desde}-${periodo.hasta}.pdf`)
}

// ── EXPORT PDF: Listado de Cards ───────────────────────────────
export function exportPDFCards(data, periodo) {
  const doc = crearPDF('Listado de Órdenes de Trabajo', `Período: ${periodo.desde}  →  ${periodo.hasta}`)
  const total = data.reduce((a, c) => a + c.total, 0)
  let y = 50
  y = kpiBox(doc, [
    { label: 'Total Órdenes', valor: data.length },
    { label: 'Facturación Total', valor: bs(total) },
  ], y)
  y += 2
  tabla(doc,
    ['#', 'Cliente', 'Fecha', 'Servicio', 'Estado', 'Mecánico', 'Serv.', 'Remp.', 'Ext.', 'Total'],
    data.map(c => [
      c.id, c.cliente_nombre, c.fecha,
      SERVICIOS_LABEL[c.tipo_servicio] || c.tipo_servicio,
      ESTADOS_LABEL[c.estado] || c.estado,
      c.mecanico, bs(c.total_servicios||0), bs(c.total_reemplazos), bs(c.total_externos), bs(c.total),
    ]),
    y,
    {
      styles: { fontSize: 7 },
      columnStyles: { 6: { halign: 'right', fontStyle: 'bold' } },
    }
  )
  doc.save(`reporte-cards-${periodo.desde}-${periodo.hasta}.pdf`)
}

// ── EXPORT EXCEL: Todo en uno (múltiples hojas) ────────────────
export function exportExcelCompleto({ resumen, mecanicos, insumos, externos, cards, clientes = [], periodo }) {
  const wb = XLSX.utils.book_new()

  // ── Hoja 1: Resumen ──
  const { totales, por_servicio, por_estado, por_mes } = resumen
  const wsResumen = XLSX.utils.aoa_to_sheet([
    ['TALLER MOTOS — Reporte de Ingresos'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    ['Generado:', hoy()],
    [],
    ['TOTALES GENERALES'],
    ['Métrica', 'Valor'],
    ['Ingreso Total', totales.ingreso_total],
    ['Costo Total', totales.costo_total],
    ['Margen Bruto', totales.margen_bruto],
    ['Cards Total', totales.cards_total],
    ['Cards Finalizadas', totales.cards_finalizadas],
    ['Ingreso Servicios', totales.ingreso_servicios],
    ['Ingreso Reemplazos', totales.ingreso_reemplazos],
    ['Ingreso Externos', totales.ingreso_externos],
    [],
    ['INGRESOS POR MES'],
    ['Mes', 'Órdenes', 'Ingreso'],
    ...por_mes.map(m => [m.mes, m.cantidad, m.ingreso]),
    [],
    ['POR TIPO DE SERVICIO'],
    ['Servicio', 'Cantidad', 'Ingreso'],
    ...Object.entries(por_servicio).map(([k, v]) => [SERVICIOS_LABEL[k] || k, v.cantidad, v.ingreso]),
    [],
    ['POR ESTADO'],
    ['Estado', 'Cantidad'],
    ...Object.entries(por_estado).map(([k, v]) => [ESTADOS_LABEL[k] || k, v]),
  ])
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  // ── Hoja 2: Mecánicos ──
  const wsMec = XLSX.utils.aoa_to_sheet([
    ['REPORTE DE MECÁNICOS'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['Mecánico', 'Tipo Sueldo', 'Sueldo Base', 'Cards Asignadas', 'Cards Finalizadas', 'Ing. Servicios', 'Ing. Reemplazos', 'Ing. Externos', 'Total Facturado'],
    ...mecanicos.map(m => [
      m.nombre, m.tipo_sueldo || '—', m.sueldo_base || 0,
      m.cards_asignadas, m.cards_finalizadas,
      m.total_servicios, m.total_reemplazos, m.total_ext, m.total_facturado,
    ]),
    [],
    ['DETALLE POR MECÁNICO'],
    ['Mecánico', 'Cliente', 'Fecha', 'Servicio', 'Total'],
    ...mecanicos.flatMap(m => (m.detalle || []).map(d => [
      m.nombre, d.cliente_nombre, d.fecha, SERVICIOS_LABEL[d.tipo_servicio] || d.tipo_servicio, d.total,
    ])),
  ])
  XLSX.utils.book_append_sheet(wb, wsMec, 'Mecánicos')

  // ── Hoja 3: Insumos ──
  const wsIns = XLSX.utils.aoa_to_sheet([
    ['REPORTE DE INSUMOS / REEMPLAZOS'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['Insumo', 'Veces Usado', 'Cantidad Total', 'Ingreso Total'],
    ...insumos.map(i => [i.nombre, i.veces_usado, i.cantidad_total, i.ingreso_total]),
    [],
    ['TOTAL', '', insumos.reduce((a,i)=>a+i.cantidad_total,0), insumos.reduce((a,i)=>a+i.ingreso_total,0)],
  ])
  XLSX.utils.book_append_sheet(wb, wsIns, 'Insumos')

  // ── Hoja 4: Externos ──
  const { lista: extLista, total_ingresos, total_costos, margen_total } = externos
  const wsExt = XLSX.utils.aoa_to_sheet([
    ['REPORTE DE TRABAJOS EXTERNOS'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['Detalle', 'Precio Final', 'Costo', 'Margen', 'Margen %', 'Card #', 'Fecha'],
    ...extLista.map(t => [t.detalle, t.precio_final, t.costo||0, t.margen, t.margen_pct, t.card_id, t.creado_en?.slice(0,10)]),
    [],
    ['TOTALES', total_ingresos, total_costos, margen_total],
  ])
  XLSX.utils.book_append_sheet(wb, wsExt, 'Externos')

  // ── Hoja 5: Órdenes ──
  const wsCards = XLSX.utils.aoa_to_sheet([
    ['LISTADO DE ÓRDENES DE TRABAJO'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['#', 'Cliente', 'Teléfono', 'Fecha', 'Servicio', 'Estado', 'Mecánico', 'Serv. Real. Bs.', 'Reemplazos Bs.', 'Externos Bs.', 'Total Bs.'],
    ...cards.map(c => [
      c.id, c.cliente_nombre, c.cliente_telefono, c.fecha,
      SERVICIOS_LABEL[c.tipo_servicio] || c.tipo_servicio,
      ESTADOS_LABEL[c.estado] || c.estado,
      c.mecanico, c.total_servicios||0, c.total_reemplazos, c.total_externos, c.total,
    ]),
    [],
    ['', '', '', '', '', '', 'TOTAL', '', '', '', cards.reduce((a,c)=>a+c.total,0)],
  ])
  XLSX.utils.book_append_sheet(wb, wsCards, 'Órdenes')

  // ── Hoja 6: Clientes ──
  const wsCli = XLSX.utils.aoa_to_sheet([
    ['REPORTE DE CLIENTES'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['#', 'Cliente', 'Teléfono', 'Visitas', 'Total Gastado', 'Ticket Promedio'],
    ...clientes.map((c, i) => [i+1, c.cliente_nombre, c.cliente_telefono||'', c.visitas, c.total_gastado, c.visitas>0?+(c.total_gastado/c.visitas).toFixed(2):0]),
  ])
  XLSX.utils.book_append_sheet(wb, wsCli, 'Clientes')

  XLSX.writeFile(wb, `taller-motos-reporte-completo-${periodo.desde}-${periodo.hasta}.xlsx`)
}

// ── Exports individuales Excel ─────────────────────────────────
export function exportExcelResumen(data) {
  const wb = XLSX.utils.book_new()
  const { totales, por_mes, por_servicio, por_estado, periodo } = data
  const ws = XLSX.utils.aoa_to_sheet([
    ['Métrica', 'Valor'],
    ['Ingreso Total', totales.ingreso_total],
    ['Costo Total', totales.costo_total],
    ['Margen Bruto', totales.margen_bruto],
    ['Cards Finalizadas', totales.cards_finalizadas],
    [], ['Mes', 'Órdenes', 'Ingreso'],
    ...por_mes.map(m=>[m.mes,m.cantidad,m.ingreso]),
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Resumen')
  XLSX.writeFile(wb, `resumen-${periodo.desde}-${periodo.hasta}.xlsx`)
}

export function exportExcelCards(data, periodo) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['#','Cliente','Teléfono','Fecha','Servicio','Estado','Mecánico','Serv. Real.','Reemplazos','Externos','Total'],
    ...data.map(c=>[c.id,c.cliente_nombre,c.cliente_telefono,c.fecha,SERVICIOS_LABEL[c.tipo_servicio]||c.tipo_servicio,ESTADOS_LABEL[c.estado]||c.estado,c.mecanico,c.total_servicios||0,c.total_reemplazos,c.total_externos,c.total]),
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Órdenes')
  XLSX.writeFile(wb, `ordenes-${periodo.desde}-${periodo.hasta}.xlsx`)
}

// ── EXPORT PDF: Clientes ───────────────────────────────────────
export function exportPDFClientes(data, periodo) {
  const doc = crearPDF(
    'Reporte de Clientes',
    `Período: ${periodo.desde}  →  ${periodo.hasta}`
  )
  const totalGastado = data.reduce((a, c) => a + c.total_gastado, 0)
  let y = 50
  y = kpiBox(doc, [
    { label: 'Clientes Únicos', valor: data.length },
    { label: 'Total Facturado', valor: bs(totalGastado) },
    { label: 'Ticket Promedio', valor: bs(data.length > 0 ? totalGastado / data.length : 0) },
  ], y)
  y += 2
  tabla(doc,
    ['#', 'Cliente', 'Teléfono', 'Visitas', 'Total Gastado'],
    data.map((c, i) => [i + 1, c.cliente_nombre, c.cliente_telefono || '—', c.visitas, bs(c.total_gastado)]),
    y,
    { columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } } }
  )
  doc.save(`reporte-clientes-${periodo.desde}-${periodo.hasta}.pdf`)
}

export function exportExcelClientes(data, periodo) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['REPORTE DE CLIENTES'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['#', 'Cliente', 'Teléfono', 'Visitas', 'Total Gastado'],
    ...data.map((c, i) => [i + 1, c.cliente_nombre, c.cliente_telefono || '', c.visitas, c.total_gastado]),
    [],
    ['', 'TOTAL', '', data.reduce((a,c)=>a+c.visitas,0), data.reduce((a,c)=>a+c.total_gastado,0)],
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
  XLSX.writeFile(wb, `clientes-${periodo.desde}-${periodo.hasta}.xlsx`)
}

export function exportExcelMecanicos(data, periodo) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['REPORTE DE MECÁNICOS'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['Mecánico','Tipo Sueldo','Sueldo Base','Cards Asignadas','Cards Finalizadas','Ing. Servicios','Ing. Reemplazos','Ing. Externos','Total Facturado'],
    ...data.map(m=>[m.nombre,m.tipo_sueldo||'—',m.sueldo_base||0,m.cards_asignadas,m.cards_finalizadas,m.total_servicios,m.total_reemplazos,m.total_ext,m.total_facturado]),
    [],
    ['DETALLE'],
    ['Mecánico','Cliente','Fecha','Servicio','Total'],
    ...data.flatMap(m=>(m.detalle||[]).map(d=>[m.nombre,d.cliente_nombre,d.fecha,d.tipo_servicio,d.total])),
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Mecánicos')
  XLSX.writeFile(wb, `mecanicos-${periodo.desde}-${periodo.hasta}.xlsx`)
}

export function exportExcelInsumos(data, periodo) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['REPORTE DE INSUMOS'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['Insumo','Veces Usado','Cantidad Total','Ingreso Total'],
    ...data.map(i=>[i.nombre,i.veces_usado,i.cantidad_total,i.ingreso_total]),
    [],
    ['TOTAL','',data.reduce((a,i)=>a+i.cantidad_total,0),data.reduce((a,i)=>a+i.ingreso_total,0)],
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Insumos')
  XLSX.writeFile(wb, `insumos-${periodo.desde}-${periodo.hasta}.xlsx`)
}

export function exportExcelExternos(data, periodo) {
  const { lista, total_ingresos, total_costos, margen_total } = data
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['REPORTE DE TRABAJOS EXTERNOS'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['Detalle','Precio Final','Costo','Margen','Margen %','Card #','Fecha'],
    ...lista.map(t=>[t.detalle,t.precio_final,t.costo||0,t.margen,t.margen_pct,t.card_id,t.creado_en?.slice(0,10)]),
    [],
    ['TOTALES',total_ingresos,total_costos,margen_total],
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Externos')
  XLSX.writeFile(wb, `externos-${periodo.desde}-${periodo.hasta}.xlsx`)
}
