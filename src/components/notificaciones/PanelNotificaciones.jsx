import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, Wrench, X } from 'lucide-react'
import useNotificacionesStore from '../../store/notificacionesStore'
import useAuthStore from '../../store/authStore'

const ESTADOS_COLOR = {
  NUEVO:      '#3b82f6',
  EN_CURSO:   '#f59e0b',
  PAUSADO:    '#8b5cf6',
  TERMINADO:  '#10b981',
  PRUEBAS:    '#06b6d4',
  FINALIZADO: '#6b7280',
}

const ESTADOS_LABEL = {
  NUEVO: 'Nuevo', EN_CURSO: 'En Curso', PAUSADO: 'Pausado',
  TERMINADO: 'Terminado', PRUEBAS: 'Pruebas', FINALIZADO: 'Finalizado',
}

function tiempoRelativo(fecha) {
  const diff = Date.now() - new Date(fecha).getTime()
  const min  = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const dias = Math.floor(diff / 86400000)
  if (min < 1)  return 'ahora'
  if (min < 60) return `hace ${min}m`
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${dias}d`
}

function extraerEstado(cuerpo) {
  const match = cuerpo.match(/→\s*([A-Z_]+)/)
  return match ? match[1] : null
}

export function BellButton() {
  const { noLeidas, panelAbierto, setPanelAbierto } = useNotificacionesStore()

  return (
    <button
      onClick={() => setPanelAbierto(!panelAbierto)}
      style={{
        position: 'relative', background: 'none', border: 'none',
        color: panelAbierto ? 'var(--accent)' : 'var(--text-soft)',
        cursor: 'pointer', padding: '6px', borderRadius: 7,
        display: 'flex', alignItems: 'center',
        transition: 'color .15s',
      }}
      title="Notificaciones"
    >
      <Bell size={17} />
      {noLeidas > 0 && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          width: 16, height: 16, borderRadius: '50%',
          background: 'var(--danger)', color: '#fff',
          fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--bg-2)',
          animation: 'pulse 2s infinite',
        }}>
          {noLeidas > 9 ? '9+' : noLeidas}
        </span>
      )}
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }`}</style>
    </button>
  )
}

export default function PanelNotificaciones() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const {
    notificaciones, noLeidas, panelAbierto, pushActivo,
    setPanelAbierto, marcarLeida, marcarTodasLeidas,
    registrarPush, cancelarPush,
  } = useNotificacionesStore()
  const panelRef = useRef(null)

  // Cerrar al hacer click afuera
  useEffect(() => {
    if (!panelAbierto) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [panelAbierto])

  const handleClick = async (notif) => {
    if (!notif.leida) await marcarLeida(token, notif.id)
    if (notif.card_id) {
      setPanelAbierto(false)
      navigate(`/cards/${notif.card_id}`)
    }
  }

  const handleTogglePush = async () => {
    if (pushActivo) await cancelarPush(token)
    else await registrarPush(token)
  }

  if (!panelAbierto) return null

  return (
    <div ref={panelRef} style={{
      position: 'absolute', top: '100%', right: 0,
      width: 340, maxWidth: '95vw',
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 12, boxShadow: '0 16px 48px var(--shadow)',
      zIndex: 200, overflow: 'hidden',
      marginTop: 8,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={14} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' }}>
            Notificaciones
          </span>
          {noLeidas > 0 && (
            <span style={{
              padding: '1px 7px', borderRadius: 9999,
              background: 'var(--danger)', color: '#fff',
              fontSize: 10, fontWeight: 700,
            }}>{noLeidas}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {noLeidas > 0 && (
            <button onClick={() => marcarTodasLeidas(token)} style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
            }} title="Marcar todas como leídas">
              <CheckCheck size={13} /> Leer todas
            </button>
          )}
          <button onClick={() => setPanelAbierto(false)} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
          }}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {notificaciones.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <Bell size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: .3 }} />
            Sin notificaciones
          </div>
        ) : (
          notificaciones.map(n => {
            const estado = extraerEstado(n.cuerpo)
            const color  = ESTADOS_COLOR[estado] || 'var(--accent)'
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: 'flex', gap: 10, padding: '12px 16px',
                  borderBottom: '1px solid var(--divider)',
                  background: n.leida ? 'transparent' : 'var(--accent-weak)',
                  cursor: n.card_id ? 'pointer' : 'default',
                  transition: 'background .15s',
                }}
                onMouseOver={e => { if (n.card_id) e.currentTarget.style.background = 'var(--border)' }}
                onMouseOut={e => { e.currentTarget.style.background = n.leida ? 'transparent' : 'var(--accent-weak)' }}
              >
                {/* Dot estado */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: color, marginTop: 5, flexShrink: 0,
                  boxShadow: n.leida ? 'none' : `0 0 6px ${color}`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: n.leida ? 400 : 600, color: 'var(--text-strong)', lineHeight: 1.4, marginBottom: 3 }}>
                    {n.titulo}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-soft)', lineHeight: 1.4, marginBottom: 4 }}>
                    {n.cuerpo}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{tiempoRelativo(n.creado_en)}</span>
                    {!n.leida && (
                      <button
                        onClick={e => { e.stopPropagation(); marcarLeida(token, n.id) }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}
                      >
                        <Check size={11} /> Leída
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer — toggle Web Push */}
      <div style={{
        padding: '10px 16px', borderTop: '1px solid var(--border)',
        background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Wrench size={11} />
          {pushActivo ? 'Notificaciones push activas' : 'Push desactivado'}
        </span>
        <button
          onClick={handleTogglePush}
          style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${pushActivo ? 'var(--danger)' : 'var(--success)'}`,
            background: pushActivo ? 'rgba(239,68,68,.1)' : 'rgba(16,185,129,.1)',
            color: pushActivo ? 'var(--danger)' : 'var(--success)',
          }}
        >
          {pushActivo ? 'Desactivar' : 'Activar push'}
        </button>
      </div>
    </div>
  )
}
