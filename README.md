# MIVO Web

Aplicación web para organizar actividades académicas y sus subtareas. Construida con React 18 y Vite 5.

## Desarrollo local

```bash
npm install
npm run dev
```

Vite sirve la aplicación en `http://localhost:5173` y reenvía `/api` al backend en `http://localhost:4000`.

Para compilar y previsualizar la versión de producción:

```bash
npm run build
npm run preview
```

## Pantallas

- `/login`, `/registro`, `/recuperar`, `/restablecer`: autenticación y recuperación de contraseña.
- `/hoy`: actividades vencidas, de hoy y próximas, con filtros y acciones persistentes.
- `/crear`: actividad, datos del curso y subtareas.
- `/eventos`: búsqueda, filtros y gestión de actividades.
- `/evento/:id`: detalle, edición, subtareas, reprogramación y bitácora.
- `/progreso`: resumen calculado con los datos del backend.
- `/perfil`: datos del usuario y límite diario.

Configura `VITE_API_URL` solo si el backend no está disponible detrás del proxy local de Vite.
