import { useNavigate } from 'react-router-dom'
import { Wrench } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:16, padding:20, textAlign:'center' }}>
      <div style={{ width:64, height:64, background:'var(--accent-weak)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Wrench size={32} color="var(--accent)" />
      </div>
      <div style={{ fontSize:64, fontWeight:'bold', color:'var(--border)', lineHeight:1 }}>404</div>
      <div style={{ fontSize:18, fontWeight:600, color:'var(--text-strong)' }}>Página no encontrada</div>
      <div style={{ fontSize:13, color:'var(--text-muted)', maxWidth:300 }}>La página que buscas no existe o fue movida.</div>
      <button onClick={() => navigate('/tablero')} style={{ marginTop:8, padding:'10px 24px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-contrast)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
        Ir al tablero
      </button>
    </div>
  )
}
