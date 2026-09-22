# AGENTS.md

## Descripción del proyecto

Sistema de reservas de club deportivo (MVP). Enfoque API-First: los contratos se definen en OpenSpec y luego se implementan.

- **Backend**: NestJS + TypeScript
- **Base de datos**: PostgreSQL 14+ vía Supabase
- **Especificaciones**: OpenSpec (`@fission-ai/openspec`) en `openspec/`
- **Frontend**: Next.js (planificado, aún no implementado)

## Comandos

```bash
# Instalación en raíz (ejecuta prisma skills sync)
pnpm install

# Backend (NestJS)
cd backend && pnpm run start:dev
```

**Aún no existen scripts de test, lint ni typecheck.** El workflow de CI (`.github/workflows/ci.yml`) es un stub sin jobs definidos.

## Arquitectura

- **API-First**: definir specs en `openspec/specs/` antes de escribir código. Usar las skills de OpenSpec (`openspec-new-change`, `openspec-propose`, etc.) para impulsar el flujo de trabajo.
- **El esquema de base de datos es el código fuente autoritativo** hoy: `backend/db/esquema-final.sql` (1968 líneas). Las reglas de negocio se ejecutan via triggers de PostgreSQL, no en la aplicación.
- **Contexto OpenSpec**: `openspec/config.yaml` define dominio, roles y reglas de negocio.

## Reglas clave de negocio (de los triggers)

- La reserva pertenece exactamente a una `Persona` (un `Usuario` o un invitado sin cuenta).
- Máximo 2 reservas `CONFIRMADA` por `Usuario` (advisory lock).
- La cancelación requiere 1 día de anticipación para reservas de autoservicio (`AUTOGESTIONADA`).
- Alquiler de equipamiento: stock se decrementa al insertar, se restaura al devolver/cancelar.
- 3+ infracciones de equipamiento → suspensión automática.
- `registros_auditoria` es solo-append (REVOKE UPDATE/DELETE).
- Supabase RLS habilitado en todas las tablas.

## Convenciones

- **Idioma**: español para nombres de dominio, tablas, columnas y comentarios de código.
- **IDs**: UUIDs (pgcrypto `gen_random_uuid()`).
- **Bajas lógicas**: columna `estado` (`ACTIVO`/`INACTIVO`) + `inactivated_at`. No hay borrados físicos en entidades principales.
- **Timestamps**: `creado_en` / `actualizado_en` con zona horaria, auto-gestionados por triggers.
- **Flujo Git**: `main` protegido, PR con 1 aprobación requerida. Ramas de feature: `feature/<nombre>`.
- **Gestor de paquetes**: pnpm con configuración de workspace en `pnpm-workspace.yaml`.

## Cuidados importantes

- El directorio `backend/` solo contiene `db/` (esquemas SQL). Aún no existe código de aplicación NestJS — está en fase de planificación/diseño.
- El directorio `frontend/` aún no existe a pesar de las referencias en el README.
- No hay archivos `.env` commiteados — la conexión a Supabase se configura via variables de entorno.
- El directorio de specs de OpenSpec (`openspec/specs/`) está vacío — no hay contratos de API escritos aún.
- `openspec/changes/` tiene un directorio `archive/` para cambios completados.

## Documentos de referencia

- `backend/db/esquema-final.sql` — esquema completo y autoritativo de la BD con triggers
- `docs/modelo-datos.md` — diagrama ER y descripciones de entidades
- `openspec/config.yaml` — contexto de dominio para OpenSpec
- `README.md` — descripción general del proyecto y roles
