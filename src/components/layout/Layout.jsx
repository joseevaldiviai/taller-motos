import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Wrench, LayoutDashboard, Users, Package, BarChart2, LogOut, Sun, Moon, Menu, X, UserCircle } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useNotificacionesStore from '../../store/notificacionesStore'
import PanelNotificaciones, { BellButton } from '../notificaciones/PanelNotificaciones'
import toast from 'react-hot-toast'

const s = {
  sidebar: { display:'flex', flexDirection:'column', height:'100%', padding:'16px 10px' },
  logo: { display:'flex', alignItems:'center', gap:10, padding:'8px 6px 20px', borderBottom:'1px solid var(--border)', marginBottom:12 },
  logoIcon: { width:34, height:34, background:'var(--accent)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent-contrast)', flexShrink:0 },
  logoText: { fontWeight:'bold', fontSize:13, color:'var(--text-strong)', lineHeight:1.2 },
  logoSub: { fontSize:10, color:'var(--text-muted)', marginTop:2 },
  navSection: { fontSize:9, fontWeight:'bold', letterSpacing:'1.8px', textTransform:'uppercase', color:'var(--text-muted)', padding:'14px 8px 6px' },
  navLink: (active) => ({ display:'flex', alignItems:'center', gap:9, padding:'9px 10px', borderRadius:7, marginBottom:2, textDecoration:'none', fontSize:13, color: active ? 'var(--accent)' : 'var(--text-soft)', background: active ? 'var(--accent-weak)' : 'transparent', fontWeight: active ? 600 : 400, transition:'all .15s' }),
  spacer: { flex:1 },
  userBox: { borderTop:'1px solid var(--border)', paddingTop:12, marginTop:8 },
  userRow: { display:'flex', alignItems:'center', gap:8, padding:'6px 8px', marginBottom:6 },
  avatar: { width:30, height:30, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:'bold', color:'var(--accent-contrast)', flexShrink:0 },
  userName: { fontSize:12, fontWeight:600, color:'var(--text-strong)', lineHeight:1.2 },
  userRol: { fontSize:10, color:'var(--text-muted)' },
  btn: { display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 10px', borderRadius:7, border:'none', background:'transparent', color:'var(--text-soft)', fontSize:12, cursor:'pointer', transition:'background .15s' },
}

function NavLinks({ onClose }) {
  const { esAdmin } = useAuthStore()
  const isAdmin = esAdmin()
  return (
    <>
      <div style={s.navSection}>Principal</div>
      <NavLink to="/tablero" style={({ isActive }) => s.navLink(isActive)} onClick={onClose}>
        <LayoutDashboard size={15} /><span>Tablero</span>
      </NavLink>
      {isAdmin && <>
        <div style={s.navSection}>Administración</div>
        <NavLink to="/usuarios" style={({ isActive }) => s.navLink(isActive)} onClick={onClose}>
          <Users size={15} /><span>Usuarios</span>
        </NavLink>
        <NavLink to="/insumos" style={({ isActive }) => s.navLink(isActive)} onClick={onClose}>
          <Package size={15} /><span>Insumos</span>
        </NavLink>
        <NavLink to="/reportes" style={({ isActive }) => s.navLink(isActive)} onClick={onClose}>
          <BarChart2 size={15} /><span>Reportes</span>
        </NavLink>
      </>}
    </>
  )
}

export default function Layout() {
  const { usuario, logout, tema, setTema, token } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { cargar, iniciarRealtime, detenerRealtime, checkPushActivo, panelAbierto } = useNotificacionesStore()

  useEffect(() => {
    if (!token || !usuario?.id) return
    cargar(token)
    iniciarRealtime(usuario.id)
    checkPushActivo()
    return () => detenerRealtime()
  }, [token, usuario?.id])

  useEffect(() => {
    const handler = (e) => {
      const n = e.detail
      toast.custom((t) => (
        <div
          onClick={() => { toast.dismiss(t.id); if (n.card_id) navigate(`/cards/${n.card_id}`) }}
          style={{ display:'flex', alignItems:'flex-start', gap:10, background:'var(--card)', border:'1px solid var(--accent)', borderRadius:10, padding:'12px 16px', cursor: n.card_id ? 'pointer' : 'default', boxShadow:'0 8px 32px var(--shadow)', maxWidth:320, opacity: t.visible ? 1 : 0, transition:'opacity .2s' }}
        >
          <Wrench size={16} color="var(--accent)" style={{ marginTop:2, flexShrink:0 }} />
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-strong)', marginBottom:3 }}>{n.titulo}</div>
            <div style={{ fontSize:12, color:'var(--text-soft)' }}>{n.cuerpo}</div>
          </div>
        </div>
      ), { duration:5000 })
    }
    window.addEventListener('notif:nueva', handler)
    return () => window.removeEventListener('notif:nueva', handler)
  }, [navigate])

  const handleLogout = async () => {
    detenerRealtime()
    await logout()
    toast.success('Sesión cerrada')
    navigate('/login')
  }

  const initials = (nombre) => nombre ? nombre.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase() : '?'

  const SidebarContent = ({ onClose }) => (
    <div style={s.sidebar}>
      <div style={s.logo}>
        <div style={s.logoIcon}><Wrench size={18} /></div>
        <div>
          <div style={s.logoText}>Taller Motos</div>
          <div style={s.logoSub}>Sistema de gestión</div>
        </div>
      </div>
      <NavLinks onClose={onClose} />
      <div style={s.spacer} />
      <div style={s.userBox}>
        <div style={s.userRow}>
          <div style={s.avatar}>{initials(usuario?.nombre || '')}</div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ ...s.userName, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{usuario?.nombre}</div>
            <div style={s.userRol}>{usuario?.rol}</div>
          </div>
          <div style={{ position:'relative' }}>
            <BellButton />
            <PanelNotificaciones />
          </div>
        </div>
        <button style={s.btn} onClick={() => setTema(tema === 'light' ? 'dark' : 'light')}
          onMouseOver={e => e.currentTarget.style.background='var(--border)'}
          onMouseOut={e => e.currentTarget.style.background='transparent'}>
          {tema === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          <span>{tema === 'light' ? 'Modo oscuro' : 'Modo claro'}</span>
        </button>
        <NavLink to="/perfil" style={({ isActive }) => ({ ...s.btn, color: isActive ? 'var(--accent)' : 'var(--text-soft)', textDecoration:'none' })} onClick={onClose}>
          <UserCircle size={14} /><span>Mi perfil</span>
        </NavLink>
        <button style={{ ...s.btn, color:'var(--danger)' }} onClick={handleLogout}
          onMouseOver={e => e.currentTarget.style.background='rgba(239,68,68,.1)'}
          onMouseOut={e => e.currentTarget.style.background='transparent'}>
          <LogOut size={14} /><span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="app-shell">
      <aside className="app-sidebar"><SidebarContent onClose={() => {}} /></aside>
      <div className={`app-overlay ${sidebarOpen ? 'is-open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`app-sidebar app-sidebar--mobile ${sidebarOpen ? 'is-open' : ''}`} style={{ position:'fixed', zIndex:30 }}>
        <div style={{ padding:'12px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
          <button onClick={() => setSidebarOpen(false)} style={{ background:'none', border:'none', color:'var(--text-soft)', cursor:'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <SidebarContent onClose={() => setSidebarOpen(false)} />
      </aside>
      <div className="app-main">
        <div className="app-mobile-bar">
          <button onClick={() => setSidebarOpen(true)} style={{ background:'none', border:'none', color:'var(--text)', cursor:'pointer', padding:4 }}>
            <Menu size={22} />
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:600, color:'var(--text-strong)' }}>
            <Wrench size={16} color="var(--accent)" /><span>Taller Motos</span>
          </div>
          <div style={{ position:'relative' }}>
            <BellButton />
            {panelAbierto && <PanelNotificaciones />}
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
