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

# Tests, lint y typecheck (backend)
cd backend && pnpm run test
cd backend && pnpm run test:e2e
cd backend && pnpm run lint
cd backend && pnpm run typecheck

# OpenSpec
npx openspec validate --strict

# GitHub CLI — gestión de fases
gh pr list --label "feature"                          # Ver PRs de features activos
gh run list --branch main --limit 5                   # Últimos CI runs en main
./scripts/phase-workflow.sh <num> <nombre> <slug>     # Iniciar nueva fase (crea issue + rama + PR draft)
```

**Scripts disponibles en `backend/package.json`:** `test`, `test:e2e`, `lint`, `typecheck`.  
**Workflows de CI en `.github/workflows/`:** `ci.yml` (lint + typecheck + test + openspec), `deploy-preview.yml`, `deploy-production.yml`.

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

## Estrategia de ramas por fase (Git Flow × tasks.md)

Cada fase definida en `openspec/changes/club-deportivo-reservas/tasks.md` se implementa en su propia rama. Esto permite integración continua (CI) con GitHub Actions, revisiones de PR aisladas y despliegues incrementales.

### Mapeo de fases → ramas

| Fase | Rama | Descripción | Estado |
|------|------|-------------|--------|
| 1 | `feature/gestion-usuarios-personas` | Registro, autenticación JWT, roles, suspensión | ✅ Completada |
| 2 | `feature/gestion-instalaciones-horarios` | CRUD disciplinas, canchas, franjas horarias | 🟡 Pendiente (2.5) |
| 3 | `feature/gestion-reservas-turnos` | Reservas, alquiler equipamiento, conflictos, stock | ✅ Completada |
| 4 | `feature/pagos-auditoria-notificaciones` | Pagos, auditoría, notificaciones email | ✅ Completada |
| 5 | `feature/integracion-validacion` | OpenAPI stubs, CI pipeline, despliegue, pruebas E2E | 🔴 Pendiente |
| 6 | `feature/frontend-sdd` | Next.js, Tailwind v4, 27 pantallas, design system | 🔴 Pendiente |

### Workflow de rama por fase

```bash
# 1. Crear rama desde main para la fase a implementar
git checkout main && git pull
git checkout -b feature/<nombre-fase>

# 2. Implementar tareas de la fase (marcar [x] en tasks.md al completar cada una)

# 3. Ejecutar tests y lint antes de commit
cd backend && pnpm run test && pnpm run lint

# 4. Commit y push
git add -A
git commit -m "feat(<fase>): implementa tareas de <nombre-fase>"
git push -u origin feature/<nombre-fase>

# 5. Crear PR en GitHub (main ← feature/<nombre-fase>)
#    - Requiere 1 aprobación
#    - CI debe pasar (GitHub Actions)
#    - Squash merge a main

# 6. Merge y cleanup
git checkout main && git pull
git branch -d feature/<nombre-fase>
```

### Reglas de branching

- **`main`**: siempre deployable. Solo recibe merges vía PR aprobado con CI verde.
- **`feature/*`**: una rama por cada fase de `tasks.md`. Se crea desde `main` y se mergea de vuelta con squash.
- **No commits directos a `main`**. Todo cambio pasa por PR.
- **Nomenclatura**: `feature/<slug-de-la-fase>` (ej: `feature/gestion-usuarios-personas`).
- **Commits**: convencionales (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).

## Integración Continua con GitHub Actions

### Workflows definidos

Los workflows se encuentran en `.github/workflows/` y se disparan automáticamente según la fase activa.

#### `ci.yml` — CI general (todas las fases)

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: club_deportivo_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Lint
        run: cd backend && pnpm run lint

      - name: Type check
        run: cd backend && pnpm run typecheck

      - name: Run tests
        run: cd backend && pnpm run test
        env:
          DATABASE_URL: postgresql://test_user:test_pass@localhost:5432/club_deportivo_test
          JWT_SECRET: test-secret-do-not-use-in-production

      - name: OpenSpec validate
        run: npx openspec validate --strict
```

#### `deploy-preview.yml` — Deploy preview por rama de feature

```yaml
name: Deploy Preview
on:
  pull_request:
    branches: [main]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to preview environment
        run: echo "Deploy preview for branch ${{ github.head_ref }}"
        # Reemplazar con deploy real (Supabase branch, Vercel preview, etc.)
```

#### `deploy-production.yml` — Deploy a producción (solo main)

```yaml
name: Deploy Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: echo "Deploy production from main"
        # Reemplazar con deploy real
```

### Configuración de GitHub CLI (`gh`) para automatización

La CLI de GitHub (`gh`) se usa para gestionar PRs, issues y actions desde la terminal, agilizando el completamiento de fases.

#### Instalación y autenticación

```bash
# Instalar GitHub CLI
winget install --id GitHub.cli        # Windows
brew install gh                        # macOS
sudo apt install gh                    # Linux

# Autenticar
gh auth login
```

#### Comandos esenciales por fase

```bash
# --- Al iniciar una fase ---

# Crear issue de tracking para la fase
gh issue create \
  --title "Fase X: <nombre-fase>" \
  --body "Implementar tareas de la fase X según \`openspec/changes/club-deportivo-reservas/tasks.md\`" \
  --label "feature,phase-X" \
  --milestone "MVP Club Deportivo"

# Crear rama y PR draft
git checkout -b feature/<nombre-fase>
git push -u origin feature/<nombre-fase>
gh pr create \
  --base main \
  --head feature/<nombre-fase> \
  --title "feat: Fase X — <nombre-fase>" \
  --body "Closes #<issue-number>. Ver \`tasks.md\` para detalle de tareas." \
  --draft \
  --label "feature"

# --- Durante el desarrollo ---

# Ver estado del CI
gh run list --branch feature/<nombre-fase> --limit 5

# Ver logs de un workflow específico
gh run view <run-id> --log

# Re-ejecutar un workflow fallido
gh run rerun <run-id>

# --- Al completar la fase ---

# Marcar PR como listo para revisión
gh pr ready feature/<nombre-fase>

# Solicitar review
gh pr review --approve  # (si tienes permisos; normalmente lo hace otro)

# Hacer squash merge (vía UI o CLI)
gh pr merge feature/<nombre-fase> --squash --delete-branch

# Cerrar issue de tracking
gh issue close <issue-number> --comment "Fase completada. PR: #<pr-number>"
```

#### Script de automatización de fase (`scripts/phase-workflow.sh`)

```bash
#!/bin/bash
# Uso: ./scripts/phase-workflow.sh <numero-fase> <nombre-fase> <slug-rama>
# Ejemplo: ./scripts/phase-workflow.sh 5 "Integración y Validación" "integracion-validacion"

PHASE_NUM=$1
PHASE_NAME=$2
BRANCH_SLUG=$3

echo "🚀 Iniciando Fase $PHASE_NUM: $PHASE_NAME"

# Crear issue
ISSUE_URL=$(gh issue create \
  --title "Fase $PHASE_NUM: $PHASE_NAME" \
  --body "Implementar tareas de la fase $PHASE_NUM según \`openspec/changes/club-deportivo-reservas/tasks.md\`" \
  --label "feature,phase-$PHASE_NUM" \
  --milestone "MVP Club Deportivo")

echo "✅ Issue creado: $ISSUE_URL"

# Crear rama
git checkout main && git pull
git checkout -b "feature/$BRANCH_SLUG"
git push -u origin "feature/$BRANCH_SLUG"

# Crear PR draft
gh pr create \
  --base main \
  --head "feature/$BRANCH_SLUG" \
  --title "feat: Fase $PHASE_NUM — $PHASE_NAME" \
  --body "Implementa tareas de la Fase $PHASE_NUM. Ver \`tasks.md\`." \
  --draft \
  --label "feature"

echo "🎯 Rama feature/$BRANCH_SLUG lista. PR draft creado. ¡A programar!"
```

### Flujo completo de CI/CD por fase

```mermaid
graph TD
    A[main] -->|git checkout -b| B[feature/fase-X]
    B --> C[Implementar tareas]
    C --> D[git push + gh pr create --draft]
    D --> E[GitHub Actions: CI]
    E -->|lint + test + openspec| F{¿CI verde?}
    F -->|Sí| G[gh pr ready]
    F -->|No| C
    G --> H[Revisión de PR]
    H -->|1 aprobación| I[gh pr merge --squash]
    I --> J[GitHub Actions: Deploy Production]
    J --> K[main actualizado]
    K -->|Siguiente fase| A
```

### Estados de CI requeridos para merge

| Check | Descripción | Workflow |
|-------|-------------|----------|
| `lint` | ESLint sin errores | `ci.yml` |
| `typecheck` | TypeScript compila sin errores | `ci.yml` |
| `test` | Tests unitarios pasan (Jest) | `ci.yml` |
| `openspec-validate` | `openspec validate --strict` sin inconsistencias | `ci.yml` |

### Variables de entorno requeridas en GitHub Secrets

| Secreto | Descripción |
|---------|-------------|
| `DATABASE_URL` | Conexión a PostgreSQL de testing |
| `JWT_SECRET` | Secreto para firmar tokens JWT |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Key de servicio para migraciones |
| `SUPABASE_ANON_KEY` | Key anónima para tests de integración |

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
- `openspec/changes/club-deportivo-reservas/tasks.md` — plan de tareas por fase (fuente de verdad para branching)
- `README.md` — descripción general del proyecto y roles
- `.github/workflows/ci.yml` — workflow de integración continua
- `.github/workflows/deploy-preview.yml` — deploy preview por PR
- `.github/workflows/deploy-production.yml` — deploy a producción desde main
- `scripts/phase-workflow.sh` — script de automatización para iniciar una nueva fase
