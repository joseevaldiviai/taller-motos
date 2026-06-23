import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, UserCheck, UserX, KeyRound } from 'lucide-react'
import { api } from '../lib/apiClient'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const s = {
  shell: { padding:'24px 20px' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 },
  title: { fontSize:22, fontWeight:'bold', color:'var(--text-strong)' },
  sub: { fontSize:12, color:'var(--text-muted)', marginTop:3 },
  btnPrimary: { display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:13, fontWeight:600, cursor:'pointer' },
  card: { background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' },
  tableHead: { display:'grid', gridTemplateColumns:'1.5fr 1fr 90px 100px 120px', padding:'10px 16px', fontSize:11, fontWeight:700, letterSpacing:'.8px', textTransform:'uppercase', color:'var(--text-muted)', borderBottom:'1px solid var(--border)', background:'var(--bg)' },
  tableRow: { display:'grid', gridTemplateColumns:'1.5fr 1fr 90px 100px 120px', padding:'13px 16px', alignItems:'center', borderBottom:'1px solid var(--divider)', fontSize:13 },
  badge: (color) => ({ display:'inline-block', padding:'3px 10px', borderRadius:9999, fontSize:11, fontWeight:700, background:`${color}22`, color }),
  avatar: (color) => ({ width:32, height:32, borderRadius:'50%', background: color, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:'bold', color:'var(--accent-contrast)', marginRight:8, flexShrink:0 }),
  nameCell: { display:'flex', alignItems:'center' },
  actBtns: { display:'flex', gap:6 },
  iconBtn: (color) => ({ padding:'5px 8px', borderRadius:6, border:`1px solid ${color}44`, background:`${color}11`, color, cursor:'pointer', display:'flex', alignItems:'center' }),
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 },
  modal: { width:'100%', maxWidth:440, background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:28, maxHeight:'90vh', overflowY:'auto' },
  modalTitle: { fontSize:16, fontWeight:'bold', color:'var(--text-strong)', marginBottom:18 },
  label: { display:'block', fontSize:11, fontWeight:600, color:'var(--text-muted)', marginBottom:5, letterSpacing:'.4px', textTransform:'uppercase' },
  input: { width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', color:'var(--text)', fontSize:13, marginBottom:12 },
  select: { width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', color:'var(--text)', fontSize:13, marginBottom:12 },
  btnRow: { display:'flex', gap:8, marginTop:8 },
  btnCancel: { flex:1, padding:'10px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-soft)', fontSize:13, cursor:'pointer' },
  btnSave: { flex:1, padding:'10px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:13, fontWeight:600, cursor:'pointer' },
  rolColors: { ADMIN:'#3b82f6', MECANICO:'#f59e0b' },
  sueldoColors: { FIJO:'#10b981', COMISION:'#8b5cf6' },
}

const initials = (n) => (n || '?').split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase()

function ModalUsuario({ token, usuario, onClose, onSaved }) {
  const isEdit = !!usuario
  const [form, setForm] = useState({
    nombre: usuario?.nombre || '',
    username: usuario?.username || '',
    email: usuario?.email || '',
    rol: usuario?.rol || 'MECANICO',
    tipo_sueldo: usuario?.tipo_sueldo || 'FIJO',
    sueldo_base: usuario?.sueldo_base || '',
    password: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!isEdit && !form.password) { toast.error('La contraseña es requerida'); return }
    setSaving(true)
    const data = {
      nombre: form.nombre,
      username: form.username,
      email: form.email,
      rol: form.rol,
      tipo_sueldo: form.rol === 'MECANICO' ? form.tipo_sueldo : null,
      sueldo_base: form.rol === 'MECANICO' && form.sueldo_base ? parseFloat(form.sueldo_base) : null,
      ...(form.password ? { password: form.password } : {}),
    }
    const res = isEdit
      ? await api.actualizarUsuario({ token, id: usuario.id, data })
      : await api.crearUsuario({ token, data })
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error || 'Error'); return }
    toast.success(isEdit ? 'Usuario actualizado' : 'Usuario creado')
    onSaved()
  }

  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={s.modal}>
        <div style={s.modalTitle}>{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</div>
        <form onSubmit={handleSave}>
          <label style={s.label}>Nombre completo *</label>
          <input style={s.input} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required placeholder="Juan Pérez" />

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={s.label}>Usuario *</label>
              <input style={s.input} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required placeholder="juanp" disabled={isEdit} />
            </div>
            <div>
              <label style={s.label}>Email *</label>
              <input style={s.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="juan@taller.com" disabled={isEdit} />
            </div>
          </div>

          <label style={s.label}>Rol *</label>
          <select style={s.select} value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))} required>
            <option value="MECANICO">Mecánico</option>
            <option value="ADMIN">Administrador</option>
          </select>

          {form.rol === 'MECANICO' && <>
            <label style={s.label}>Tipo de sueldo *</label>
            <select style={s.select} value={form.tipo_sueldo} onChange={e => setForm(f => ({ ...f, tipo_sueldo: e.target.value }))}>
              <option value="FIJO">Fijo</option>
              <option value="COMISION">Comisión</option>
            </select>
            <label style={s.label}>{form.tipo_sueldo === 'FIJO' ? 'Sueldo mensual (Bs.)' : 'Base de comisión (Bs.)'}</label>
            <input style={s.input} type="number" min="0" step="0.01" value={form.sueldo_base} onChange={e => setForm(f => ({ ...f, sueldo_base: e.target.value }))} placeholder="0.00" />
          </>}

          <label style={s.label}>{isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
          <input style={s.input} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required={!isEdit} />

          <div style={s.btnRow}>
            <button type="button" style={s.btnCancel} onClick={onClose}>Cancelar</button>
            <button type="submit" style={{ ...s.btnSave, opacity: saving ? .6 : 1 }} disabled={saving}>
              {saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Usuarios() {
  const { token } = useAuthStore()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'crear' | { usuario }
  const [filtroRol, setFiltroRol] = useState('TODOS')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await api.listarUsuarios({ token })
    if (res?.ok) setUsuarios(res.data || [])
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  const toggleActivo = async (u) => {
    const res = await api.actualizarUsuario({ token, id: u.id, data: { activo: !u.activo } })
    if (!res?.ok) { toast.error(res?.error || 'Error'); return }
    toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado')
    load()
  }

  const filtrados = filtroRol === 'TODOS' ? usuarios : usuarios.filter(u => u.rol === filtroRol)

  return (
    <div style={s.shell}>
      <div style={s.header}>
        <div>
          <div style={s.title}>👥 Usuarios</div>
          <div style={s.sub}>{usuarios.length} usuarios registrados</div>
        </div>
        <button style={s.btnPrimary} onClick={() => setModal('crear')}>
          <Plus size={14} /> Nuevo usuario
        </button>
      </div>

      {/* Filtro */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {['TODOS','ADMIN','MECANICO'].map(r => (
          <button key={r} onClick={() => setFiltroRol(r)} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background: filtroRol === r ? 'var(--accent)' : 'transparent', color: filtroRol === r ? 'var(--accent-contrast)' : 'var(--text-soft)', fontSize:12, fontWeight: filtroRol === r ? 700 : 400, cursor:'pointer' }}>
            {r === 'TODOS' ? 'Todos' : r}
          </button>
        ))}
      </div>

      <div style={s.card}>
        {/* Header tabla */}
        <div style={{ ...s.tableHead }}>
          <span>Nombre</span>
          <span>Usuario</span>
          <span>Rol</span>
          <span>Sueldo</span>
          <span>Acciones</span>
        </div>

        {loading
          ? <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>Cargando…</div>
          : filtrados.length === 0
          ? <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>Sin usuarios</div>
          : filtrados.map(u => (
            <div key={u.id} style={{ ...s.tableRow, opacity: u.activo ? 1 : .5 }}>
              <div style={s.nameCell}>
                <div style={s.avatar(s.rolColors[u.rol] || '#888')}>{initials(u.nombre)}</div>
                <div>
                  <div style={{ fontWeight:600, color:'var(--text-strong)' }}>{u.nombre}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{u.email}</div>
                </div>
              </div>
              <span style={{ color:'var(--text-soft)', fontFamily:'monospace', fontSize:12 }}>@{u.username}</span>
              <span style={s.badge(s.rolColors[u.rol] || '#888')}>{u.rol}</span>
              <div>
                {u.rol === 'MECANICO' && u.tipo_sueldo
                  ? <div>
                      <span style={s.badge(s.sueldoColors[u.tipo_sueldo] || '#888')}>{u.tipo_sueldo}</span>
                      {u.sueldo_base && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>Bs. {u.sueldo_base}</div>}
                    </div>
                  : <span style={{ color:'var(--text-muted)', fontSize:12 }}>—</span>
                }
              </div>
              <div style={s.actBtns}>
                <button style={s.iconBtn('var(--info)')} onClick={() => setModal({ usuario: u })} title="Editar">
                  <Pencil size={13} />
                </button>
                <button style={s.iconBtn(u.activo ? 'var(--danger)' : 'var(--success)')} onClick={() => toggleActivo(u)} title={u.activo ? 'Desactivar' : 'Activar'}>
                  {u.activo ? <UserX size={13} /> : <UserCheck size={13} />}
                </button>
              </div>
            </div>
          ))
        }
      </div>

      {(modal === 'crear' || modal?.usuario) && (
        <ModalUsuario
          token={token}
          usuario={modal?.usuario || null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
