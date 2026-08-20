import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { api } from '../lib/apiClient'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const s = {
  shell: { padding:'24px 20px' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 },
  title: { fontSize:22, fontWeight:'bold', color:'var(--text-strong)' },
  sub: { fontSize:12, color:'var(--text-muted)', marginTop:3 },
  btnPrimary: { display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:13, fontWeight:600, cursor:'pointer' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:14 },
  card: { background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:18, transition:'border-color .15s', cursor:'default' },
  cardName: { fontSize:15, fontWeight:600, color:'var(--text-strong)', marginBottom:6 },
  cardPrice: { fontSize:20, fontWeight:'bold', color:'var(--accent)', marginBottom:6 },
  cardStock: (low) => ({ fontSize:12, color: low ? 'var(--danger)' : 'var(--success)', marginBottom:12 }),
  actBtns: { display:'flex', gap:6 },
  iconBtn: (color) => ({ padding:'6px 10px', borderRadius:6, border:`1px solid ${color}44`, background:`${color}11`, color, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12 }),
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 },
  modal: { width:'100%', maxWidth:380, background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:28 },
  modalTitle: { fontSize:16, fontWeight:'bold', color:'var(--text-strong)', marginBottom:18 },
  label: { display:'block', fontSize:11, fontWeight:600, color:'var(--text-muted)', marginBottom:5, letterSpacing:'.4px', textTransform:'uppercase' },
  input: { width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', color:'var(--text)', fontSize:13, marginBottom:12 },
  btnRow: { display:'flex', gap:8, marginTop:8 },
  btnCancel: { flex:1, padding:'10px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-soft)', fontSize:13, cursor:'pointer' },
  btnSave: { flex:1, padding:'10px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:13, fontWeight:600, cursor:'pointer' },
}

function ModalInsumo({ token, insumo, onClose, onSaved }) {
  const isEdit = !!insumo
  const [form, setForm] = useState({ nombre: insumo?.nombre || '', precio: insumo?.precio || '', stock: insumo?.stock || 0 })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const data = { nombre: form.nombre, precio: parseFloat(form.precio), stock: parseInt(form.stock) || 0 }
    const res = isEdit
      ? await api.actualizarInsumo({ token, id: insumo.id, data })
      : await api.crearInsumo({ token, data })
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error || 'Error'); return }
    toast.success(isEdit ? 'Ítem actualizado' : 'Ítem creado')
    onSaved()
  }

  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{isEdit ? 'Editar Ítem' : 'Nuevo Ítem de Inventario'}</div>
        <form onSubmit={handleSave}>
          <label style={s.label}>Nombre *</label>
          <input style={s.input} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required placeholder="Ej: Filtro de aceite" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={s.label}>Precio (Bs.) *</label>
              <input style={s.input} type="number" min="0" step="0.01" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} required placeholder="0.00" />
            </div>
            <div>
              <label style={s.label}>Stock</label>
              <input style={s.input} type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <div style={s.btnRow}>
            <button type="button" style={s.btnCancel} onClick={onClose}>Cancelar</button>
            <button type="submit" style={{ ...s.btnSave, opacity: saving ? .6 : 1 }} disabled={saving}>
              {saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Insumos() {
  const { token } = useAuthStore()
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await api.listarInsumos({ token })
    if (res?.ok) setInsumos(res.data || [])
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este insumo?')) return
    const res = await api.eliminarInsumo({ token, id })
    if (!res?.ok) { toast.error(res?.error || 'Error'); return }
    toast.success('Ítem eliminado')
    load()
  }

  const filtrados = insumos.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <div style={s.shell}>
      <div style={s.header}>
        <div>
          <div style={s.title}>📦 Inventario</div>
          <div style={s.sub}>{insumos.length} ítems en inventario</div>
        </div>
        <button style={s.btnPrimary} onClick={() => setModal('crear')}>
          <Plus size={14} /> Nuevo ítem
        </button>
      </div>

      <input
        style={{ width:'100%', maxWidth:340, background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 14px', color:'var(--text)', fontSize:13, marginBottom:18 }}
        placeholder="Buscar en inventario…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
      />

      {loading
        ? <div style={{ padding:60, textAlign:'center', color:'var(--text-muted)' }}>Cargando…</div>
        : filtrados.length === 0
        ? <div style={{ padding:60, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
            <Package size={32} style={{ display:'block', margin:'0 auto 12px', opacity:.3 }} />
            {busqueda ? 'Sin resultados' : 'No hay ítems en inventario'}
          </div>
        : <div style={s.grid}>
            {filtrados.map(ins => (
              <div key={ins.id} style={s.card}
                onMouseOver={e => e.currentTarget.style.borderColor='var(--accent)'}
                onMouseOut={e => e.currentTarget.style.borderColor='var(--border)'}>
                <div style={s.cardName}>{ins.nombre}</div>
                <div style={s.cardPrice}>Bs. {parseFloat(ins.precio).toFixed(2)}</div>
                <div style={s.cardStock(ins.stock < 5)}>
                  {ins.stock < 5 ? '⚠️ ' : '✓ '} Stock: {ins.stock} unidades
                </div>
                <div style={s.actBtns}>
                  <button style={s.iconBtn('var(--info)')} onClick={() => setModal({ insumo: ins })}>
                    <Pencil size={12} /> Editar
                  </button>
                  <button style={s.iconBtn('var(--danger)')} onClick={() => handleEliminar(ins.id)}>
                    <Trash2 size={12} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
      }

      {(modal === 'crear' || modal?.insumo) && (
        <ModalInsumo
          token={token}
          insumo={modal?.insumo || null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
