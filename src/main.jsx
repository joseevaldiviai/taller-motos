import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0f;
    --bg-2: #0d1520;
    --bg-3: #080c12;
    --card: #0d1520;
    --border: #1e2d3d;
    --border-strong: #2a3f55;
    --divider: #16202c;
    --nav-active: #162030;
    --text: #e8e6f0;
    --text-strong: #fffffe;
    --text-muted: #4a6070;
    --text-soft: #6b7f90;
    --text-faint: #7a93a6;
    --text-dim: #8898a8;
    --accent: #f59e0b;
    --accent-contrast: #000;
    --accent-weak: rgba(245, 158, 11, 0.13);
    --info: #3b82f6;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    --shadow: rgba(0,0,0,.6);
    --scroll-track: #0a0a0f;
    --scroll-thumb: #1e2d3d;
    /* estados de las cards */
    --estado-nuevo:      #3b82f6;
    --estado-en-curso:   #f59e0b;
    --estado-pausado:    #8b5cf6;
    --estado-terminado:  #10b981;
    --estado-pruebas:    #06b6d4;
    --estado-finalizado: #6b7280;
  }
  :root[data-theme='light'] {
    --bg: #f5f7fb;
    --bg-2: #ffffff;
    --bg-3: #f1f5f9;
    --card: #ffffff;
    --border: #cbd5e1;
    --border-strong: #b6c3d1;
    --divider: #e2e8f0;
    --nav-active: #ffe9bf;
    --text: #1f2937;
    --text-strong: #0f172a;
    --text-muted: #64748b;
    --text-soft: #6b7280;
    --text-faint: #94a3b8;
    --text-dim: #475569;
    --accent: #f59e0b;
    --accent-contrast: #1f2937;
    --accent-weak: rgba(245, 158, 11, 0.18);
    --info: #2563eb;
    --success: #16a34a;
    --danger: #dc2626;
    --shadow: rgba(15, 23, 42, 0.12);
    --scroll-track: #e2e8f0;
    --scroll-thumb: #cbd5e1;
  }
  html, body, #root { min-height: 100%; }
  body { background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: var(--scroll-track); }
  ::-webkit-scrollbar-thumb { background: var(--scroll-thumb); border-radius: 3px; }
  input, select, textarea, button { font-family: inherit; }
  button { touch-action: manipulation; }
  input:focus, select:focus, textarea:focus { border-color: var(--accent) !important; outline: none; }
  .page-shell { padding: 32px; font-family: Georgia, serif; color: var(--text); }
  .page-header { margin-bottom: 18px; }
  .button-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .stack-sm { display: grid; gap: 10px; }
  .stack-md { display: grid; gap: 16px; }
  .grid-two { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px; }
  .grid-three { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; }
  .grid-four { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
  .table-wrap { width: 100%; overflow-x: auto; }
  .app-shell { display: flex; min-height: 100vh; background: var(--bg); font-family: Georgia, serif; }
  .app-sidebar { width: 220px; background: var(--bg-2); border-right: 1px solid var(--border); display: flex; flex-direction: column; flex-shrink: 0; }
  .app-main { flex: 1; min-width: 0; overflow: auto; }
  .app-mobile-bar { display: none; }
  .app-overlay { display: none; }
  .app-nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; margin-bottom: 2px; text-decoration: none; font-size: 13px; }
  /* Tablero Kanban */
  .kanban-board { display: grid; grid-template-columns: repeat(6, minmax(200px, 1fr)); gap: 12px; overflow-x: auto; padding-bottom: 16px; }
  .kanban-col { background: var(--bg-2); border: 1px solid var(--border); border-radius: 10px; padding: 12px; min-height: 80vh; }
  .kanban-col-header { font-size: 11px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .kanban-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 8px; cursor: pointer; transition: border-color .15s, box-shadow .15s; }
  .kanban-card:hover { border-color: var(--accent); box-shadow: 0 4px 16px var(--shadow); }
  @media (max-width: 1200px) {
    .kanban-board { grid-template-columns: repeat(3, minmax(180px, 1fr)); }
    .grid-four { grid-template-columns: repeat(2, minmax(0,1fr)); }
  }
  @media (max-width: 960px) {
    .page-shell { padding: 20px; }
    .grid-two, .grid-three, .grid-four { grid-template-columns: minmax(0,1fr); }
    .kanban-board { grid-template-columns: repeat(2, minmax(180px, 1fr)); }
    .app-shell { min-height: 100dvh; }
    .app-mobile-bar { display: flex; position: sticky; top: 0; z-index: 15; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border); background: color-mix(in srgb, var(--bg-2) 88%, transparent); backdrop-filter: blur(10px); }
    .app-sidebar { position: fixed; top: 0; left: 0; bottom: 0; z-index: 30; width: min(82vw, 320px); transform: translateX(-100%); transition: transform .2s ease; box-shadow: 0 24px 80px var(--shadow); }
    .app-sidebar.is-open { transform: translateX(0); }
    .app-overlay { display: block; position: fixed; inset: 0; z-index: 20; background: rgba(0,0,0,.45); opacity: 0; pointer-events: none; transition: opacity .2s ease; }
    .app-overlay.is-open { opacity: 1; pointer-events: auto; }
    .app-main { overflow: visible; }
  }
  @media (max-width: 640px) {
    .page-shell { padding: 16px; }
    .page-header h1 { font-size: 20px !important; }
    .kanban-board { grid-template-columns: minmax(180px, 1fr); }
  }
`
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
