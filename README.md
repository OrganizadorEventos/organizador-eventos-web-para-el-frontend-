# Organizador de Eventos — Web (frontend)

SPA en **React 18 + Vite 5** del **Organizador de Eventos Independientes**: crear eventos con plan logístico, ver las gestiones urgentes de hoy, reprogramar ante imprevistos (con resolución de conflictos) y seguir la barra de progreso de preparación.

## Inicio rápido

```bash
npm install
npm run dev        # http://localhost:5173 (proxy /api → backend en :4000)
```

En producción:

```bash
npm run build      # genera frontend/dist
npm run preview    # previsualiza el build
```

## Rutas

| Ruta | Pantalla | Tarea núcleo |
|------|----------|--------------|
| `/login`, `/registro` | Autenticación + usuario demo | Sprint 2+ |
| `/hoy` | Gestiones urgentes del día con reglas de prioridad | T2 |
| `/crear` | Evento + plan de trabajo logístico inicial | T1 |
| `/eventos` | Listado con progreso y contadores | T1/T4 |
| `/evento/:id` | Detalle: tareas, reprogramar (conflicto), ejecutar | T1/T3/T4 |
| `/progreso` | Barra de progreso por evento + bitácora | T4 |

Rutas protegidas: sin sesión, todo redirige a `/login`.

## Configuración (variables de entorno)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | URL base del backend (en dev el proxy de Vite la resuelve) |

En producción en Vercel: `VITE_API_URL=https://<backend>.onrender.com`. Ver `.env.example`.

## Estructura

```
src/
├── api.js          # Cliente fetch con JWT automático + ApiError
├── auth.jsx        # Contexto de autenticación (login/registro/demo/logout)
├── lib/dates.js    # Utilidades de fechas en zona local
├── components/     # Layout, Modal, NoteModal, ConflictoModal, ProgressBar, Estados
└── pages/          # Login, Register, Hoy, Crear, Eventos, EventoDetalle, Progreso
```

## Accesibilidad mínima implementada

- Todos los inputs con `<label>` o `aria-label`.
- Navegación completa por teclado y foco visible (`:focus-visible`), skip-link.
- `role="alert"` / `aria-live` en errores y estados; `role="dialog"` en modales (Escape cierra).
- Contraste WCAG AA y `prefers-reduced-motion`.

## Despliegue (Vercel)

- Producción: https://organizador-eventos-web-para-el-fro-one.vercel.app
- API en producción: `VITE_API_URL=https://organizador-eventos-api.onrender.com/api`
- Build command: `npm install && npm run build`.
- Output: `dist`.
- El `vercel.json` con rewrites SPA está en la raíz del repo (rutas client-side funcionan al recargar).
- Las llamadas a la API usan `VITE_API_URL` (el proxy `/api` solo existe en dev).

## Proyecto

Proyecto educativo. Detalle de decisiones UX y contrato API en la documentación del equipo (`docs/` del workspace).