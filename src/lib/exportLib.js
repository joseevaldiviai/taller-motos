import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// ── helpers ────────────────────────────────────────────────────
const bs = (n) => `Bs. ${Number(n || 0).toFixed(2)}`
const pct = (n) => `${n}%`
const hoy = () => new Date().toLocaleDateString('es-BO')

const SERVICIOS_LABEL = {
  CAMBIO_ACEITE:             'Cambio Aceite',
  REPARACION_MOTOR:          'Rep. Motor',
  AJUSTE_VALVULAS:           'Ajuste Válvulas',
  LIMPIEZA_CARBURADOR:       'Limpieza Carburador',
  LIMPIEZA_INYECTORES:       'Limp. Inyectores',
  CAMBIO_KIT_TRANSMISION:    'Kit Transmisión',
  CAMBIO_PASTILLAS:          'Pastillas/Zapatas',
  PURGA_FRENOS:              'Purga Frenos',
  REPARACION_SUSPENSION:     'Rep. Suspensión',
  REPARACION_ELECTRICA:      'Rep. Eléctrica',
  CAMBIO_BATERIA:            'Cambio Batería',
  ESCANEO_COMPUTARIZADO:     'Escaneo',
  LIMPIEZA_SISTEMA_INYECCION:'Limp. Inyección',
  CAMBIO_LLANTAS:            'Cambio Llantas',
  MANTENIMIENTO_BASICO:      'Mant. Básico',
  MANTENIMIENTO_COMPLETO:    'Mant. Completo',
  MANTENIMIENTO_DETALLADO:   'Mant. Detallado',
  RESTAURACION:              'Restauración',
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
    'Reporte de Ingresos por Mecánico',
    `Período: ${periodo.desde}  →  ${periodo.hasta}`
  )
  let y = 50

  // KPIs globales
  const totalIng = data.reduce((a,m) => a + m.total_facturado, 0)
  const totalCos = data.reduce((a,m) => a + (m.costo_total||0), 0)
  const totalMar = data.reduce((a,m) => a + (m.margen||0), 0)
  y = kpiBox(doc, [
    { label: 'Ingreso Total', valor: bs(totalIng) },
    { label: 'Costo Total',   valor: bs(totalCos) },
    { label: 'Margen Total',  valor: bs(totalMar) },
    { label: 'Mecánicos',     valor: String(data.length) },
  ], y)
  y += 2

  // Resumen global con margen
  y = tabla(doc,
    ['Mecánico', 'Tipo Sueldo', 'Asignadas', 'Finalizadas', 'Servicios', 'Reemplazos', 'Externos', 'Costo', 'Margen %', 'Total'],
    data.map(m => [
      m.nombre, m.tipo_sueldo || '—', m.cards_asignadas, m.cards_finalizadas,
      bs(m.total_servicios), bs(m.total_reemplazos), bs(m.total_ext),
      bs(m.costo_total||0), pct(m.margen_pct||0), bs(m.total_facturado),
    ]),
    y,
    { columnStyles: { 7: { halign:'right' }, 8: { halign:'right' }, 9: { halign:'right', fontStyle:'bold' } } }
  )

  // Detalle por mecánico con desglose de ingresos y costos
  data.forEach(m => {
    if (!m.detalle?.length) return
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 40, 50)
    doc.text(`Detalle — ${m.nombre}  |  Total: ${bs(m.total_facturado)}  |  Costo: ${bs(m.costo_total||0)}  |  Margen: ${bs(m.margen||0)} (${m.margen_pct||0}%)`, 14, y)
    y += 3
    y = tabla(doc,
      ['Cliente', 'Fecha', 'Servicio', 'Servicios', 'Reemplazos', 'Externos', 'Costo', 'Total'],
      m.detalle.map(d => [
        d.cliente_nombre, d.fecha,
        (Array.isArray(d.tipo_servicio) ? d.tipo_servicio.map(t=>SERVICIOS_LABEL[t]||t).join(', ') : (SERVICIOS_LABEL[d.tipo_servicio] || d.tipo_servicio)),
        bs(d.total_servicios), bs(d.total_reemplazos), bs(d.total_externos),
        bs(d.costo||0), bs(d.total),
      ]),
      y,
      { columnStyles: { 6: { halign:'right' }, 7: { halign:'right', fontStyle:'bold' } }, styles: { fontSize: 7 } }
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
export function exportExcelCompleto({ resumen, mecanicos, insumos, externos, cards, clientes = [], asistencia = [], pl = null, periodo }) {
  const wb = XLSX.utils.book_new()

  // ── Hoja 1: Resumen Ejecutivo ──
  const { totales, por_servicio, por_estado, por_mes } = resumen
  const wsResumen = XLSX.utils.aoa_to_sheet([
    ['TALLER MOTOS — REPORTE EJECUTIVO'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    ['Generado:', hoy()],
    [],
    ['TOTALES GENERALES'],
    ['Métrica', 'Valor', 'Descripción'],
    ['Ingreso Total', totales.ingreso_total, 'Suma de servicios + reemplazos + externos'],
    ['Costo Total', totales.costo_total, 'Costo de trabajos externos (de cards finalizadas)'],
    ['Margen Bruto', totales.margen_bruto, 'Ingreso Total - Costo Externos'],
    ['Cards Total', totales.cards_total, 'Todas las cards registradas en el período'],
    ['Cards Finalizadas', totales.cards_finalizadas, 'Cards con estado FINALIZADO'],
    ['Ingreso Servicios', totales.ingreso_servicios, 'Solo mano de obra'],
    ['Ingreso Reemplazos', totales.ingreso_reemplazos, 'Venta de repuestos'],
    ['Ingreso Externos', totales.ingreso_externos, 'Servicios de terceros facturados'],
    [],
    ['INGRESOS MENSUALES'],
    ['Mes', 'Cards Finalizadas', 'Ingreso Bruto'],
    ...por_mes.map(m => [m.mes, m.cantidad, m.ingreso]),
    [],
    ['DISTRIBUCIÓN POR TIPO DE SERVICIO'],
    ['Servicio', 'Cantidad', 'Ingreso', '% Participación'],
    ...Object.entries(por_servicio).map(([k, v]) => [
      SERVICIOS_LABEL[k] || k,
      v.cantidad,
      v.ingreso,
      totales.ingreso_total > 0 ? (v.ingreso / totales.ingreso_total) : 0
    ]),
    [],
    ['ESTADO ACTUAL DE CARDS'],
    ['Estado', 'Cantidad'],
    ...Object.entries(por_estado).map(([k, v]) => [ESTADOS_LABEL[k] || k, v]),
  ])
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Ejecutivo')

  // ── Hoja 2: Mecánicos (Rendimiento) ──
  const wsMec = XLSX.utils.aoa_to_sheet([
    ['DESEMPEÑO Y FACTURACIÓN POR MECÁNICO'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['Mecánico', 'Tipo Sueldo', 'Sueldo Semanal / %', 'Cards Asignadas', 'Cards Finalizadas', 'Ing. Servicios', 'Ing. Reemplazos', 'Ing. Externos', 'Costo Total', 'Margen Bs.', 'Margen %', 'Total Facturado'],
    ...mecanicos.map(m => [
      m.nombre, m.tipo_sueldo || '—', m.sueldo_semanal || 0,
      m.cards_asignadas, m.cards_finalizadas,
      m.total_servicios, m.total_reemplazos, m.total_ext,
      m.costo_total||0, m.margen||0, (m.margen_pct||0)/100, m.total_facturado,
    ]),
    [],
    ['DETALLE POR ORDEN'],
    ['Mecánico', 'ID Card', 'Cliente', 'Fecha', 'Servicio', 'Ing. Servicios', 'Ing. Reemplazos', 'Ing. Externos', 'Costo Directo', 'Total Bruto'],
    ...mecanicos.flatMap(m => (m.detalle || []).map(d => [
      m.nombre, d.card_id || '—', d.cliente_nombre, d.fecha,
      Array.isArray(d.tipo_servicio) ? d.tipo_servicio.map(t=>SERVICIOS_LABEL[t]||t).join(', ') : (SERVICIOS_LABEL[d.tipo_servicio] || d.tipo_servicio),
      d.total_servicios, d.total_reemplazos, d.total_externos, d.costo||0, d.total,
    ])),
  ])
  XLSX.utils.book_append_sheet(wb, wsMec, 'Mecánicos')

  // ── Hoja 3: Listado Maestro de Órdenes ──
  const wsCards = XLSX.utils.aoa_to_sheet([
    ['LISTADO MAESTRO DE ÓRDENES DE TRABAJO'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['ID', 'Cliente', 'Teléfono', 'Fecha', 'Servicios (Categorías)', 'Estado', 'Mecánico', 'Mano de Obra (Bs)', 'Repuestos (Bs)', 'Externos (Bs)', 'Total (Bs)'],
    ...cards.map(c => [
      c.id, c.cliente_nombre, c.cliente_telefono, c.fecha,
      Array.isArray(c.tipo_servicio) ? c.tipo_servicio.map(t=>SERVICIOS_LABEL[t]||t).join(', ') : (SERVICIOS_LABEL[c.tipo_servicio] || c.tipo_servicio),
      ESTADOS_LABEL[c.estado] || c.estado,
      c.mecanico, c.total_servicios||0, c.total_reemplazos, c.total_externos, c.total,
    ]),
  ])
  XLSX.utils.book_append_sheet(wb, wsCards, 'Listado Órdenes')

  // ── Hoja 4: Detalle de Repuestos (Reemplazos) ──
  const repuestosDetalle = []
  cards.forEach(c => {
    if (!c.reemplazos) return
    c.reemplazos.forEach(r => {
      repuestosDetalle.push([
        c.id, c.cliente_nombre, c.fecha, r.nombre, r.cantidad, r.precio, r.cantidad * r.precio
      ])
    })
  })
  const wsRep = XLSX.utils.aoa_to_sheet([
    ['DETALLE DE REPUESTOS / REEMPLAZOS UTILIZADOS'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['Card ID', 'Cliente', 'Fecha', 'Repuesto', 'Cantidad', 'Precio Unit.', 'Subtotal'],
    ...repuestosDetalle,
    [],
    ['', '', '', '', '', 'TOTAL', repuestosDetalle.reduce((a,r)=>a+r[6], 0)]
  ])
  XLSX.utils.book_append_sheet(wb, wsRep, 'Detalle Repuestos')

  // ── Hoja 5: Detalle de Mano de Obra (Servicios) ──
  const serviciosDetalle = []
  cards.forEach(c => {
    if (!c.servicios_realizados) return
    c.servicios_realizados.forEach(s => {
      serviciosDetalle.push([
        c.id, c.cliente_nombre, c.fecha, s.nombre, s.precio
      ])
    })
  })
  const wsServ = XLSX.utils.aoa_to_sheet([
    ['DETALLE DE SERVICIOS / MANO DE OBRA REALIZADA'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['Card ID', 'Cliente', 'Fecha', 'Trabajo Realizado', 'Precio (Bs)'],
    ...serviciosDetalle,
    [],
    ['', '', '', 'TOTAL', serviciosDetalle.reduce((a,s)=>a+s[4], 0)]
  ])
  XLSX.utils.book_append_sheet(wb, wsServ, 'Detalle Mano Obra')

  // ── Hoja 6: Inventario (Ranking) ──
  const wsIns = XLSX.utils.aoa_to_sheet([
    ['RANKING DE INSUMOS MÁS UTILIZADOS'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['Insumo / Pieza', 'Veces Utilizado (Ordenes)', 'Cantidad Total Vendida', 'Ingreso Total Bruto'],
    ...insumos.map(i => [i.nombre, i.veces_usado, i.cantidad_total, i.ingreso_total]),
    [],
    ['TOTALES', '', insumos.reduce((a,i)=>a+i.cantidad_total,0), insumos.reduce((a,i)=>a+i.ingreso_total,0)],
  ])
  XLSX.utils.book_append_sheet(wb, wsIns, 'Ranking Insumos')

  // ── Hoja 7: Trabajos Externos ──
  const { lista: extLista, total_ingresos, total_costos, margen_total } = externos
  const wsExt = XLSX.utils.aoa_to_sheet([
    ['REPORTE DETALLADO DE TRABAJOS EXTERNOS (TERCEROS)'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['Detalle Trabajo', 'Ingreso (Precio Final)', 'Costo (Taller)', 'Margen (Bs.)', 'Margen %', 'Card #', 'Fecha'],
    ...extLista.map(t => [t.detalle, t.precio_final, t.costo||0, t.margen, (t.margen_pct||0)/100, t.card_id, t.creado_en?.slice(0,10)]),
    [],
    ['TOTALES', total_ingresos, total_costos, margen_total],
  ])
  XLSX.utils.book_append_sheet(wb, wsExt, 'Trabajos Externos')

  // ── Hoja 8: Clientes ──
  const wsCli = XLSX.utils.aoa_to_sheet([
    ['FIDELIZACIÓN Y FRECUENCIA DE CLIENTES'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['Rank', 'Cliente', 'Teléfono', 'Visitas (Ordenes)', 'Total Facturado (Bs)', 'Ticket Promedio'],
    ...clientes.map((c, i) => [i+1, c.cliente_nombre, c.cliente_telefono||'', c.visitas, c.total_gastado, c.visitas>0?+(c.total_gastado/c.visitas).toFixed(2):0]),
  ])
  XLSX.utils.book_append_sheet(wb, wsCli, 'Frecuencia Clientes')

  // ── Hoja 9: Asistencia ──
  const wsAsis = XLSX.utils.aoa_to_sheet([
    ['REGISTRO DE ASISTENCIA Y HORAS ACTIVAS'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['Personal', 'Usuario', 'Rol', 'Ingreso', 'Salida', 'Estado'],
    ...(asistencia || []).map(a => [
      a.usuario?.nombre || '—',
      a.usuario?.username || '—',
      a.usuario?.rol || '—',
      new Date(a.ingreso).toLocaleString('es-BO'),
      a.salida ? new Date(a.salida).toLocaleString('es-BO') : '—',
      a.activo ? 'ACTIVO' : 'CERRADO',
    ]),
  ])
  XLSX.utils.book_append_sheet(wb, wsAsis, 'Asistencia')

  // ── Hoja 10: Ganancias y Pérdidas (P&L) ──
  if (pl) {
    const { ingresos, costos_mercaderia, gastos_operativos, resumen_financiero } = pl
    const wsPL = XLSX.utils.aoa_to_sheet([
      ['BALANCE DE GANANCIAS Y PÉRDIDAS (P&L)'],
      [`Período: ${periodo.desde} → ${periodo.hasta}`],
      ['Generado:', hoy()],
      [],
      ['CONCEPTO FINANCIERO', 'MONTO (Bs.)'],
      ['1. INGRESOS BRUTOS', ''],
      ['   - Ingresos por Servicios (Mano de obra)', ingresos.servicios],
      ['   - Ingresos por Reemplazos / Repuestos', ingresos.reemplazos],
      ['   - Ingresos por Trabajos Externos', ingresos.externos],
      ['   TOTAL INGRESOS (A)', ingresos.total],
      [],
      ['2. COSTOS DIRECTOS DE MERCADERÍA', ''],
      ['   - Costo de Repuestos Vendidos', costos_mercaderia.repuestos],
      ['   - Costo de Trabajos Externos', costos_mercaderia.externos],
      ['   TOTAL COSTOS DIRECTOS (B)', costos_mercaderia.total],
      [],
      ['3. GASTOS OPERATIVOS / TALLER', ''],
      ['   - Compras y Gastos Operativos', gastos_operativos.compras_taller],
      ['   - Sueldos del Personal', gastos_operativos.sueldos_personal],
      ['   TOTAL GASTOS OPERATIVOS (C)', gastos_operativos.total],
      [],
      ['4. RESUMEN Y UTILIDAD NETA', ''],
      ['   Total Ingresos (A)', ingresos.total],
      ['   Total Costos y Gastos (B + C)', resumen_financiero.costo_total_general],
      ['   UTILIDAD / GANANCIA NETA', resumen_financiero.utilidad_neta],
      ['   Margen de Utilidad Neta (%)', `${resumen_financiero.margen_neto_pct}%`],
    ])
    XLSX.utils.book_append_sheet(wb, wsPL, 'Ganancias y Pérdidas')
  }

  XLSX.writeFile(wb, `taller-motos-reporte-DETALLADO-${periodo.desde}-${periodo.hasta}.xlsx`)
}

export function exportPDFGananciasPerdidas(pl, periodo) {
  const doc = crearPDF('Balance de Ganancias y Pérdidas (P&L)', `Período: ${periodo.desde} → ${periodo.hasta}`)
  const { ingresos, costos_mercaderia, gastos_operativos, resumen_financiero } = pl

  let y = 52
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('ESTADO DE RESULTADOS CONTABLE', 14, y)
  y += 6

  autoTable(doc, {
    startY: y,
    head: [['Concepto Financiero', 'Monto (Bs.)']],
    body: [
      ['1. INGRESOS BRUTOS', ''],
      ['   - Ingresos por Servicios (Mano de obra)', bs(ingresos.servicios)],
      ['   - Ingresos por Repuestos / Reemplazos', bs(ingresos.reemplazos)],
      ['   - Ingresos por Trabajos Externos', bs(ingresos.externos)],
      ['   TOTAL INGRESOS (A)', bs(ingresos.total)],
      ['2. COSTOS DIRECTOS DE MERCADERÍA', ''],
      ['   - Costo de Repuestos Vendidos', bs(costos_mercaderia.repuestos)],
      ['   - Costo de Trabajos Externos', bs(costos_mercaderia.externos)],
      ['   TOTAL COSTOS DIRECTOS (B)', bs(costos_mercaderia.total)],
      ['3. GASTOS OPERATIVOS / TALLER', ''],
      ['   - Compras y Gastos Operativos', bs(gastos_operativos.compras_taller)],
      ['   - Sueldos del Personal', bs(gastos_operativos.sueldos_personal)],
      ['   TOTAL GASTOS OPERATIVOS (C)', bs(gastos_operativos.total)],
      ['4. RESUMEN Y UTILIDAD NETA', ''],
      ['   Total Ingresos (A)', bs(ingresos.total)],
      ['   Total Costos y Gastos (B + C)', bs(resumen_financiero.costo_total_general)],
      ['   UTILIDAD / GANANCIA NETA', bs(resumen_financiero.utilidad_neta)],
      ['   Margen de Utilidad Neta', `${resumen_financiero.margen_neto_pct}%`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 29, 41] },
    styles: { fontSize: 8 },
  })

  doc.save(`ganancias-y-perdidas-${periodo.desde}-${periodo.hasta}.pdf`)
}

export function exportExcelGananciasPerdidas(pl, periodo) {
  const { ingresos, costos_mercaderia, gastos_operativos, resumen_financiero } = pl
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['BALANCE DE GANANCIAS Y PÉRDIDAS (P&L)'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    ['Generado:', hoy()],
    [],
    ['CONCEPTO FINANCIERO', 'MONTO (Bs.)'],
    ['1. INGRESOS BRUTOS', ''],
    ['   - Ingresos por Servicios (Mano de obra)', ingresos.servicios],
    ['   - Ingresos por Reemplazos / Repuestos', ingresos.reemplazos],
    ['   - Ingresos por Trabajos Externos', ingresos.externos],
    ['   TOTAL INGRESOS (A)', ingresos.total],
    [],
    ['2. COSTOS DIRECTOS DE MERCADERÍA', ''],
    ['   - Costo de Repuestos Vendidos', costos_mercaderia.repuestos],
    ['   - Costo de Trabajos Externos', costos_mercaderia.externos],
    ['   TOTAL COSTOS DIRECTOS (B)', costos_mercaderia.total],
    [],
    ['3. GASTOS OPERATIVOS / TALLER', ''],
    ['   - Compras y Gastos Operativos', gastos_operativos.compras_taller],
    ['   - Sueldos del Personal', gastos_operativos.sueldos_personal],
    ['   TOTAL GASTOS OPERATIVOS (C)', gastos_operativos.total],
    [],
    ['4. RESUMEN Y UTILIDAD NETA', ''],
    ['   Total Ingresos (A)', ingresos.total],
    ['   Total Costos y Gastos (B + C)', resumen_financiero.costo_total_general],
    ['   UTILIDAD / GANANCIA NETA', resumen_financiero.utilidad_neta],
    ['   Margen de Utilidad Neta (%)', `${resumen_financiero.margen_neto_pct}%`],
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Ganancias y Pérdidas')
  XLSX.writeFile(wb, `ganancias-y-perdidas-${periodo.desde}-${periodo.hasta}.xlsx`)
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
    ['REPORTE DE INGRESOS POR MECÁNICO'],
    [`Período: ${periodo.desde} → ${periodo.hasta}`],
    [],
    ['Mecánico','Tipo Sueldo','Sueldo Semanal','Asignadas','Finalizadas','Ing. Servicios','Ing. Reemplazos','Ing. Externos','Costo Total','Margen','Margen %','Total Facturado'],
    ...data.map(m=>[m.nombre,m.tipo_sueldo||'—',m.sueldo_semanal||0,m.cards_asignadas,m.cards_finalizadas,m.total_servicios,m.total_reemplazos,m.total_ext,m.costo_total||0,m.margen||0,m.margen_pct||0,m.total_facturado]),
    [],
    ['TOTALES','','','','','',
      data.reduce((a,m)=>a+m.total_servicios,0),
      data.reduce((a,m)=>a+m.total_reemplazos,0),
      data.reduce((a,m)=>a+m.total_ext,0),
      data.reduce((a,m)=>a+(m.costo_total||0),0),
      data.reduce((a,m)=>a+(m.margen||0),0),'',
      data.reduce((a,m)=>a+m.total_facturado,0)],
    [],
    ['DETALLE POR MECÁNICO'],
    ['Mecánico','Cliente','Fecha','Servicio','Servicios','Reemplazos','Externos','Costo','Total'],
    ...data.flatMap(m=>(m.detalle||[]).map(d=>[
      m.nombre,d.cliente_nombre,d.fecha,
      Array.isArray(d.tipo_servicio)?d.tipo_servicio.map(t=>SERVICIOS_LABEL[t]||t).join(', '):(SERVICIOS_LABEL[d.tipo_servicio]||d.tipo_servicio),
      d.total_servicios,d.total_reemplazos,d.total_externos,d.costo||0,d.total
    ])),
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

export function exportPDFCardDetalle(card) {
  const doc = crearPDF(`Comprobante de Orden de Trabajo #${card.id}`, `Cliente: ${card.cliente_nombre}  |  Fecha: ${card.fecha}`)
  
  let y = 52
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('DATOS DE LA ORDEN', 14, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Cliente: ${card.cliente_nombre}`, 14, y)
  doc.text(`Teléfono: ${card.cliente_telefono || '—'}`, 110, y)
  y += 5
  doc.text(`Estado: ${ESTADOS_LABEL[card.estado] || card.estado}`, 14, y)
  doc.text(`Mecánico: ${card.mecanico?.nombre || '—'}`, 110, y)
  y += 5
  const tipos = Array.isArray(card.tipo_servicio) ? card.tipo_servicio.map(t=>SERVICIOS_LABEL[t]||t).join(', ') : (SERVICIOS_LABEL[card.tipo_servicio] || card.tipo_servicio)
  doc.text(`Tipo de Servicio: ${tipos || '—'}`, 14, y)
  y += 5
  const estadoPago = card.pagado ? `PAGADO (${card.metodo_pago || 'EFECTIVO'})` : 'PENDIENTE DE PAGO'
  doc.text(`Estado de Pago: ${estadoPago}`, 14, y)
  y += 8

  if (card.notas) {
    doc.setFont('helvetica', 'bold')
    doc.text('Notas:', 14, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.text(card.notas, 14, y, { maxWidth: 180 })
    y += 10
  }

  // Servicios Realizados
  if (card.servicios_realizados?.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text('Servicios Realizados (Mano de Obra)', 14, y)
    y += 2
    autoTable(doc, {
      startY: y,
      head: [['Servicio', 'Descripción', 'Precio']],
      body: card.servicios_realizados.map(s => [s.nombre, s.descripcion || '—', bs(s.precio)]),
      theme: 'grid',
      headStyles: { fillColor: [15, 29, 41] },
      styles: { fontSize: 8 },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // Reemplazos
  if (card.reemplazos?.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text('Repuestos y Reemplazos', 14, y)
    y += 2
    autoTable(doc, {
      startY: y,
      head: [['Repuesto', 'Cantidad', 'Precio Unit.', 'Subtotal']],
      body: card.reemplazos.map(r => [r.nombre, r.cantidad, bs(r.precio), bs(r.precio * r.cantidad)]),
      theme: 'grid',
      headStyles: { fillColor: [15, 29, 41] },
      styles: { fontSize: 8 },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // Trabajos Externos
  if (card.trabajos_externos?.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text('Trabajos Externos', 14, y)
    y += 2
    autoTable(doc, {
      startY: y,
      head: [['Detalle', 'Precio Final']],
      body: card.trabajos_externos.map(t => [t.detalle, bs(t.precio_final)]),
      theme: 'grid',
      headStyles: { fillColor: [15, 29, 41] },
      styles: { fontSize: 8 },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // Totales
  const serv = (card.servicios_realizados||[]).reduce((a,s)=>a+(s.precio||0),0)
  const remp = (card.reemplazos||[]).reduce((a,r)=>a+r.precio*r.cantidad,0)
  const ext  = (card.trabajos_externos||[]).reduce((a,t)=>a+t.precio_final,0)
  const total = serv + remp + ext

  if (y > 250) {
    doc.addPage()
    y = 20
  }

  doc.setFillColor(240, 243, 246)
  doc.rect(14, y, 182, 22, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 29, 41)
  doc.text('RESUMEN DE COBRO', 20, y + 7)
  doc.setFontSize(11)
  doc.text(`TOTAL A PAGAR: ${bs(total)}`, 190, y + 14, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Mano de Obra: ${bs(serv)}  |  Repuestos: ${bs(remp)}  |  Externos: ${bs(ext)}`, 20, y + 15)

  doc.save(`orden-trabajo-${card.id}-${card.cliente_nombre.replace(/\s+/g, '_')}.pdf`)
}
