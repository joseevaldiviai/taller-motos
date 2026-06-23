import { useState } from 'react'
import { User, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { api } from '../lib/apiClient'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const s = {
  shell:   { padding:'24px 20px', maxWidth:600, margin:'0 auto' },
  title:   { fontSize:22, fontWeight:'bold', color:'var(--text-strong)', marginBottom:4 },
  sub:     { fontSize:12, color:'var(--text-muted)', marginBottom:24 },
  card:    { background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:24, marginBottom:16 },
  secTtl:  { display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700, letterSpacing:'.5px', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:18 },
  row:     { display:'grid', gridTemplateColumns:'140px 1fr', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--divider)' },
  rowLbl:  { fontSize:12, color:'var(--text-muted)', fontWeight:500 },
  rowVal:  { fontSize:13, color:'var(--text-strong)' },
  badge:   (c) => ({ display:'inline-block', padding:'2px 10px', borderRadius:9999, fontSize:11, fontWeight:700, background:`${c}22`, color:c }),
  label:   { display:'block', fontSize:11, fontWeight:600, color:'var(--text-muted)', marginBottom:5, letterSpacing:'.4px', textTransform:'uppercase' },
  inpWrap: { position:'relative', marginBottom:14 },
  input:   { width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 36px 9px 12px', color:'var(--text)', fontSize:13 },
  eye:     { position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:2, display:'flex' },
  btnSave: { padding:'10px 24px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 },
  tip:     { fontSize:11, color:'var(--text-muted)', marginTop:4 },
}

const ROL_COLOR = { ADMIN:'#3b82f6', MECANICO:'#f59e0b' }
const SUELDO_COLOR = { FIJO:'#10b981', COMISION:'#8b5cf6' }

export default function Perfil() {
  const { token, usuario } = useAuthStore()
  const [form, setForm] = useState({ actual:'', nueva:'', confirmar:'' })
  const [show, setShow] = useState({ actual:false, nueva:false, confirmar:false })
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.nueva.length < 6) { toast.error('La nueva contraseña debe tener al menos 6 caracteres'); return }
    if (form.nueva !== form.confirmar) { toast.error('Las contraseñas no coinciden'); return }
    setSaving(true)
    const res = await api.cambiarPassword({ token, nueva: form.nueva })
    setSaving(false)
    if (!res?.ok) { toast.error(res?.error || 'Error al cambiar contraseña'); return }
    setOk(true)
    setForm({ actual:'', nueva:'', confirmar:'' })
    toast.success('Contraseña actualizada correctamente')
    setTimeout(() => setOk(false), 4000)
  }

  const toggle = (field) => setShow(s => ({ ...s, [field]: !s[field] }))

  return (
    <div style={s.shell}>
      <div style={s.title}>Mi Perfil</div>
      <div style={s.sub}>Información de tu cuenta y configuración de seguridad</div>

      {/* Info de cuenta */}
      <div style={s.card}>
        <div style={s.secTtl}><User size={14} /> Datos de la cuenta</div>

        <div style={s.row}>
          <span style={s.rowLbl}>Nombre</span>
          <span style={s.rowVal}>{usuario?.nombre}</span>
        </div>
        <div style={s.row}>
          <span style={s.rowLbl}>Usuario</span>
          <span style={{ ...s.rowVal, fontFamily:'monospace', fontSize:12 }}>@{usuario?.username}</span>
        </div>
        <div style={s.row}>
          <span style={s.rowLbl}>Rol</span>
          <span style={s.badge(ROL_COLOR[usuario?.rol] || '#888')}>{usuario?.rol}</span>
        </div>
        {usuario?.rol === 'MECANICO' && usuario?.tipo_sueldo && (
          <div style={s.row}>
            <span style={s.rowLbl}>Tipo de sueldo</span>
            <span style={s.badge(SUELDO_COLOR[usuario.tipo_sueldo] || '#888')}>{usuario.tipo_sueldo}</span>
          </div>
        )}
        <div style={{ ...s.row, borderBottom:'none' }}>
          <span style={s.rowLbl}>ID</span>
          <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'monospace' }}>{usuario?.id}</span>
        </div>
      </div>

      {/* Cambio de contraseña */}
      <div style={s.card}>
        <div style={s.secTtl}><Lock size={14} /> Cambiar contraseña</div>

        {ok && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)', borderRadius:8, marginBottom:16, fontSize:13, color:'var(--success)' }}>
            <CheckCircle size={15} /> Contraseña actualizada correctamente
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Nueva contraseña *</label>
          <div style={s.inpWrap}>
            <input
              style={s.input}
              type={show.nueva ? 'text' : 'password'}
              value={form.nueva}
              onChange={e => setForm(f => ({ ...f, nueva: e.target.value }))}
              placeholder="Mínimo 6 caracteres"
              required
            />
            <button type="button" style={s.eye} onClick={() => toggle('nueva')}>
              {show.nueva ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>

          <label style={s.label}>Confirmar nueva contraseña *</label>
          <div style={s.inpWrap}>
            <input
              style={{
                ...s.input,
                borderColor: form.confirmar && form.nueva !== form.confirmar ? 'var(--danger)' : undefined,
              }}
              type={show.confirmar ? 'text' : 'password'}
              value={form.confirmar}
              onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))}
              placeholder="Repite la nueva contraseña"
              required
            />
            <button type="button" style={s.eye} onClick={() => toggle('confirmar')}>
              {show.confirmar ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
          {form.confirmar && form.nueva !== form.confirmar && (
            <div style={{ ...s.tip, color:'var(--danger)', marginBottom:12, marginTop:-8 }}>Las contraseñas no coinciden</div>
          )}

          <button
            type="submit"
            style={{ ...s.btnSave, opacity: saving ? .6 : 1 }}
            disabled={saving || (!!form.confirmar && form.nueva !== form.confirmar)}
          >
            <Lock size={14} />
            {saving ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
