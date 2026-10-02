# MIVO · Organizador de eventos

Aplicación web para crear y organizar eventos, planificar gestiones logísticas, programar fechas y horas, y hacer seguimiento de su preparación. Construida con React 18 y Vite 5.

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

- `/login`, `/registro`, `/recuperar`, `/restablecer`: acceso y recuperación de cuenta.
- `/hoy`: agenda de preparación con gestiones vencidas, para hoy y próximas.
- `/crear`: creación de eventos por tipo, fecha, lugar y descripción, con su plan logístico.
- `/eventos`: búsqueda, filtros y gestión de los eventos organizados.
- `/evento/:id`: detalle, edición, gestiones logísticas, reprogramación y bitácora.
- `/progreso`: resumen del avance de preparación de los eventos.
- `/perfil`: datos de la cuenta y límite diario para planificar gestiones.

Las gestiones representan acciones organizativas como reservar un espacio, coordinar proveedores o enviar invitaciones. La API conserva nombres de rutas heredados (`tasks`) por compatibilidad.

Configura `VITE_API_URL` solo si el backend no está disponible detrás del proxy local de Vite.
