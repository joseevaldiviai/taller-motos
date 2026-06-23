# 🏍️ Taller Motos — Sistema de Gestión

Sistema de reservación y gestión de órdenes de trabajo para taller de motos.

## Stack
- **Frontend:** React 18 + Vite + React Router + Zustand + Lucide
- **Backend:** Cloudflare Workers (JWT propio)
- **Base de datos:** Supabase (PostgreSQL)
- **Deploy:** Cloudflare Pages + Workers

---

## Configuración

### 1. Supabase
1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar el SQL de `/supabase/migrations/001_schema.sql` en el SQL Editor
3. Copiar `Project URL` y `service_role secret` (Settings → API)

### 2. Variables de entorno

Crear `.env` en la raíz:
```
VITE_API_BASE_URL=http://127.0.0.1:8787
```

Crear `.dev.vars` en la raíz (para el Worker en desarrollo):
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET=una-clave-secreta-larga-aleatoria
```

Para producción, configurar con Wrangler:
```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put JWT_SECRET
```

### 3. Instalación
```bash
npm install
```

### 4. Desarrollo
```bash
# Terminal 1 — Worker
npm run dev:worker

# Terminal 2 — Frontend
npm run dev
```

### 5. Crear admin inicial
Abrir el navegador en `http://localhost:5173/login` y hacer clic en **"Crear admin por defecto"**.

Credenciales por defecto:
- Usuario: `admin`
- Contraseña: `Admin1234!`

---

## Base de datos

| Tabla | Descripción |
|---|---|
| `user_profiles` | Usuarios del sistema (admin y mecánicos) |
| `insumos` | Catálogo de repuestos y partes |
| `cards` | Órdenes de trabajo (una por moto) |
| `reemplazos` | Piezas usadas en cada orden |
| `trabajos_externos` | Servicios de terceros en cada orden |
| `trabajos_realizados` | Log de cambios de estado |
| `config` | Precios por defecto de servicios |

## Estados de una Card (orden)

```
NUEVO → EN_CURSO → PAUSADO ↔ EN_CURSO
                 → TERMINADO → PRUEBAS → FINALIZADO
                                       → EN_CURSO (si falla prueba)
```

## Servicios disponibles
- Mantenimiento Básico
- Mantenimiento Completo
- Cambio de Aceite
- Reparación de Telescopio

## Cálculo del total
```
Total = precio_servicio + Σ(reemplazos) + Σ(trabajos_externos.precio_final)
```

## Deploy producción
```bash
# Worker
npm run deploy:worker

# Frontend (Cloudflare Pages)
npm run deploy:pages
# Subir la carpeta /dist a Cloudflare Pages
```

---

## Sistema de Notificaciones

### In-App (Supabase Realtime)
- Cada cambio de estado inserta filas en `notificaciones` para **todos los usuarios activos**
- El frontend escucha con `supabase-js` Realtime via WebSocket
- Aparece un toast clicable + el panel de la campana con contador de no leídas
- Requiere habilitar Realtime en Supabase Dashboard: **Database → Replication → notificaciones ✓**

### Web Push (VAPID)
- Funciona aunque la app esté cerrada
- El Service Worker (`/public/sw.js`) recibe el push y muestra la notificación nativa del navegador
- Click en la notificación navega directamente a la card

### Generar claves VAPID
```bash
npm run generate:vapid
# Copiar las claves al .dev.vars y wrangler secrets
```

### Configurar secrets en producción
```bash
wrangler secret put VAPID_PUBLIC_KEY
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_SUBJECT     # ej: admin@tudominio.com
```

### Activar Realtime en Supabase
En el SQL Editor ejecutar:
```sql
alter publication supabase_realtime add table public.notificaciones;
```


---

## Módulo de Reportes

### Acceso
Solo administradores — ruta `/reportes` en el sidebar.

### Reportes disponibles

| Reporte | PDF | Excel | Descripción |
|---|---|---|---|
| Resumen General | ✅ | ✅ | KPIs, ingresos por mes, por servicio, por estado |
| Mecánicos | ✅ | ✅ | Rendimiento, facturación y detalle por mecánico |
| Insumos/Reemplazos | ✅ | ✅ | Ranking de piezas más usadas e ingresos |
| Trabajos Externos | ✅ | ✅ | Margen bruto por trabajo externo |
| Listado de Órdenes | ✅ | ✅ | Todas las cards del período con desglose |
| Clientes | ✅ | ✅ | Frecuencia de visita y gasto por cliente |
| **Export completo** | — | ✅ | Un Excel con 6 hojas (todos los reportes) |

### Período
Filtros rápidos: Este mes / Últimos 3 meses / Este año / Todo.
También se puede seleccionar fechas exactas.

### Fórmulas de cálculo
```
Total orden     = precio_servicio + Σ(reemplazos) + Σ(trabajos_externos.precio_final)
Margen externo  = precio_final - costo
Ticket promedio = total_gastado / visitas_cliente
```
