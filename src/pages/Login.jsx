import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wrench, Eye, EyeOff } from 'lucide-react'
import { api } from '../lib/apiClient'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const s = {
  shell: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:20 },
  card: { width:'100%', maxWidth:380, background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'36px 32px' },
  logo: { display:'flex', alignItems:'center', gap:12, marginBottom:28 },
  logoIcon: { width:42, height:42, background:'var(--accent)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent-contrast)' },
  title: { fontSize:22, fontWeight:'bold', color:'var(--text-strong)' },
  sub: { fontSize:12, color:'var(--text-muted)', marginTop:2 },
  label: { display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6, letterSpacing:'.5px' },
  input: { width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', color:'var(--text)', fontSize:14 },
  inputWrap: { position:'relative' },
  eyeBtn: { position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:2 },
  btn: { width:'100%', padding:'12px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontWeight:'bold', fontSize:14, cursor:'pointer', marginTop:6, transition:'opacity .15s' },
  sep: { marginBottom:16 },
  seedBtn: { width:'100%', padding:'8px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', fontSize:12, cursor:'pointer', marginTop:10 },
}

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const res = await api.login({ username: form.username, password: form.password })
    setLoading(false)
    if (!res?.ok) { toast.error(res?.error || 'Error al iniciar sesión'); return }
    login(res.data.token, res.data.usuario, res.data.refresh_token, res.data.session_id)
    toast.success(`Bienvenido, ${res.data.usuario.nombre}`)
    navigate('/tablero')
  }

  const handleSeed = async () => {
    const res = await api.seedAdmin()
    if (res?.ok) toast.success(res.data?.message || 'Admin creado')
    else toast.error(res?.error || 'Error')
  }

  return (
    <div style={s.shell}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoIcon}><Wrench size={22} /></div>
          <div>
            <div style={s.title}>Taller Motos</div>
            <div style={s.sub}>Sistema de gestión</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={s.sep}>
            <label style={s.label}>Usuario</label>
            <input style={s.input} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="admin" autoComplete="username" required />
          </div>
          <div style={s.sep}>
            <label style={s.label}>Contraseña</label>
            <div style={s.inputWrap}>
              <input style={{ ...s.input, paddingRight:36 }} type={showPwd ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" autoComplete="current-password" required />
              <button type="button" style={s.eyeBtn} onClick={() => setShowPwd(v => !v)}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button style={{ ...s.btn, opacity: loading ? .6 : 1 }} disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <button style={s.seedBtn} onClick={handleSeed}>
          Crear admin por defecto
        </button>
      </div>
    </div>
  )
}
