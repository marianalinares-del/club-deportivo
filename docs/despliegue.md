# Guía de despliegue

Resumen de cómo desplegar frontend (Vercel) y backend (Node) para que se hablen entre sí.

## 1. Frontend en Vercel

**Configuración del proyecto** (Vercel → Project → Settings → General):

| Setting | Valor |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Next.js (autodetectado) |
| Install Command | `pnpm install` |
| Build Command | `pnpm build` |
| Output Directory | (auto) `.next` |
| Node.js | 22 |

> Si `Root Directory` queda vacío, Vercel no encuentra `next.config.ts`, no detecta el framework y el dominio responde **404** en todas las rutas.

**Variables de entorno** (Vercel → Project → Settings → Environment Variables):

| Clave | Ejemplo | Tipo | Notas |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://tu-backend.onrender.com/api/v1` | Plaintext | Debe incluir `/api/v1`. El prefijo `NEXT_PUBLIC_` es intencional: el browser necesita la URL del API. Al ser *Plaintext* no aparece el aviso de "secret exposed". |

- No hace falta cargar la URL del propio sitio: Vercel ya expone `VERCEL_URL` y `VERCEL_PROJECT_PRODUCTION_URL`.
- Las variables `NEXT_PUBLIC_*` se **incrustan en el bundle durante el build**: si cambiás el valor hay que **redeployar**, no reiniciar.

## 2. Backend

Plataformas sugeridas: Render, Railway o Fly.io (con Node 20+).

**Variables de entorno obligatorias:**

| Clave | Notas |
|---|---|
| `DATABASE_URL` | Pooler de Supabase en IPv4: `postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true` (el host directo `db.[REF].supabase.co:5432` no resuelve en IPv4) |
| `JWT_SECRET` | Mismo valor que en local |
| `JWT_EXPIRATION` | Opcional, ej. `24h` |
| `PORT` | Lo inyecta la plataforma; el backend escucha en `0.0.0.0` |
| `CORS_ORIGINS` | Dominio del frontend, separado por comas: `https://club-deportivo-phi.vercel.app` |
| `SUPABASE_*` | Solo si el backend consume Supabase Auth/Functions |

Build command: `pnpm --filter club-deportivo-backend run build` (o `cd backend && pnpm install && pnpm run build`).
Start command: `node backend/dist/main.js`.

## 3. Checklist cuando el frontend da 404

1. ¿`Root Directory` = `frontend` en Vercel?
2. ¿El build del deployment terminó en **Ready** (tab Deployments)?
3. ¿La variable `NEXT_PUBLIC_API_URL` está cargada en **Production** y se redeployó después de cambiarla?
4. ¿El backend responde? Un `GET /api/v1/disciplines` que devuelve `401`/`200` (y no `404`) confirma que el backend está vivo.

## 4. Checklist cuando el frontend carga pero no hay datos

Casi siempre es CORS: el navegador bloquea si el dominio del frontend no está en `CORS_ORIGINS` del backend. Verificar en la consola del navegador (*blocked by CORS policy*) y reiniciar el backend tras cambiar la variable.
