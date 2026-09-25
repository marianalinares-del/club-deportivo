# Especificaciones del Proyecto - Club Deportivo

Análisis completo del estado actual del proyecto y lo que falta para comenzar el desarrollo.

## 1. Descripción General

**Proyecto:** Sistema de Reservas - Club Deportivo  
**Objetivo:** MVP para plataforma de reservas de canchas deportivas (Tenis, Fútbol, Pádel)  
**Enfoque:** API-First con OpenSpec para contratos de API  
**Estado actual:** Etapa inicial - Estructura definida, especificaciones en preparación

---

## 2. Stack Tecnológico Definido

| Capa | Tecnología | Estado |
|------|------------|--------|
| Frontend | Next.js, TypeScript | **No instalado** |
| Backend | NestJS, TypeScript | **No instalado** |
| Base de datos | PostgreSQL (Supabase) | **Esquema definido** |
| Especificación | OpenSpec | **Configurado** |
| CI/CD | GitHub Actions | **Configuración básica** |
| Gestor de paquetes | pnpm | **Instalado** |

---

## 3. Lo que Ya está Instalado/Configurado

### 3.1 Dependencias Principales
- **OpenSpec** (`@fission-ai/openspec: ^1.12.0`): Instalado en `package.json`
- **pnpm**: Gestor de paquetes configurado (ver `pnpm-lock.yaml`)

### 3.2 Estructura del Repositorio
```
club-deportivo/              # ← Raíz del proyecto
├── backend/                 # Backend NestJS (pendiente inicializar)
├── frontend/                # Frontend Next.js (pendiente crear)
├── docs/                    # Documentación del modelo de datos
├── openspec/                # Especificaciones OpenSpec
├── .github/workflows/       # CI/CD básico
├── package.json             # Dependencias raíz
└── tsconfig.json            # Configuración TypeScript raíz
```

### 3.3 Base de Datos (Esquema SQL Definitivo)
**Archivo principal:** `backend/db/esquema-final.sql` (1968 líneas)

**⚠️ IMPORTANTE:** Los siguientes archivos en `backend/db/` son **documentación de referencia** y serán **eliminados** al no ser necesarios para el desarrollo:
- `schema.sql` (v1) - Borrador inicial con PKs SERIAL
- `schema-guada.sql` (v2) - Borrador intermedio con PKs UUID
- `schema(1).sql` - Copia adicional
- `persona.sql` - Definiciones parciales de personas
- `esquemaUltimo.sql` - Otra versión del esquema
- `Auditoria.md` - Documentación de auditoría comparativa

**El único archivo a conservar es `esquema-final.sql`** que contiene el esquema completo y definitivo.

**Tablas implementadas (12 tablas):**
| Tabla | Descripción |
|-------|-------------|
| `personas` | Entidad raíz de identidad (DNI, CUIL, nombre, apellido) |
| `contactos_persona` | Emails y teléfonos (múltiples por persona) |
| `direcciones_persona` | Direcciones físicas (personal/laboral) |
| `usuarios` | Cuentas del sistema (SOCIO/GERENTE/ADMINISTRADOR) |
| `solicitudes_permiso` | Altas de socios (autoregistro/gestionada) |
| `registros_auditoria` | Eventos del sistema (append-only) |
| `disciplinas` | Catálogo deportivo (Fútbol, Tenis, Pádel) |
| `canchas` | Canchas por disciplina con precio base |
| `franjas_horarias` | Grilla de turnos por cancha y día |
| `equipamientos` | Artículos deportivos con stock |
| `reservas` | Reservas de canchas (CONFIRMADA/EN_CURSO/COMPLETADA/CANCELADA) |
| `detalle_alquiler_equipamiento` | Alquileres asociados a reservas |

**Triggers implementados (10 triggers):**
1. `trg_validar_reserva` - Valida día de semana, estado cancha, usuario activo, máximo 2 reservas
2. `trg_actualizar_reserva` - Controla transiciones de estado y cancelación
3. `trg_validar_alquiler` - Valida stock, disciplina y usuario para alquileres
4. `trg_set_fecha_devolucion` - Calcula fecha estimada de devolución
5. `trg_recalcular_monto` - Actualiza monto total de reserva
6. `trg_gestionar_devolucion` - Maneja devoluciones e incumplimientos
7. `trg_liberar_equipamiento_cancelado` - Libera stock al cancelar reserva
8. `trg_auditar_reserva` - Registra eventos de auditoría
9. `trg_cancha_mantenimiento` - Cancela reservas al poner cancha en mantenimiento
10. `trg_*_actualizado` - Actualizan campo `actualizado_en` automáticamente

**Funciones PL/pgSQL (8 funciones):**
1. `fn_update_actualizado_en()` - Actualiza timestamp de modificación
2. `fn_set_inactivated_at()` - Maneja bajas lógicas
3. `fn_validar_contacto_login()` - Valida email de login
4. `fn_validar_gestor()` - Valida rol de aprobador
5. `fn_procesar_solicitud()` - Procesa aprobación/rechazo de solicitudes
6. `fn_validar_reserva()` - Valida reglas de negocio para reservas
7. `fn_actualizar_reserva()` - Controla transiciones de estado
8. `fn_validar_alquiler_equipamiento()` - Valida y descuenta stock

**Vistas:**
- `v_reservas_detalle` - Vista completa con información de canchas, franjas y personas

**Seguridad:**
- Row Level Security (RLS) habilitado en todas las 12 tablas (políticas pendientes)
- `REVOKE UPDATE, DELETE ON registros_auditoria FROM PUBLIC` (append-only)

**Índices críticos:**
- `uq_reserva_franja_fecha_activa` - Evita doble reserva (parcial, solo CONFIRMADA/EN_CURSO)
- `uq_contacto_persona_activo` - Unicidad de contactos activos
- `uq_email_activo_global` - Email único globalmente
- `idx_*` - Múltiples índices para búsquedas frecuentes

### 3.4 Especificaciones OpenSpec
**Configuración:** `openspec/config.yaml` con schema spec-driven

**Cambios definidos (2 propuestas paralelas):**
1. `sports-club-reservation-api` - Propuesta API-First (4 módulos)
2. `club-deportivo-reservas` - Propuesta completa (4 módulos)

**Módulos especificados:**
| Módulo | Alcance |
|--------|---------|
| `gestion-usuarios-personas` | Registro, autenticación, perfil, roles |
| `gestion-instalaciones-horarios` | Disciplinas, canchas, franjas horarias |
| `gestion-reservas-turnos` | Reservas, alquiler equipamiento, conflictos |
| `pagos-auditoria-notificaciones` | Pagos, auditoría, notificaciones |

### 3.5 Documentación
- `docs/modelo-datos.md` - Modelo conceptual y físico detallado (115 líneas)
- `docs/bbdd.md` - Diagrama ER en Mermaid
- `openspec/changes/*/proposal.md` - Propuestas de negocio
- `openspec/changes/*/design.md` - Diseño técnico
- `openspec/changes/*/tasks.md` - Tareas de implementación

### 3.6 CI/CD
**Archivo:** `.github/workflows/ci.yml` (7 líneas - configuración mínima)
- Trigger en push a main/develop
- Trigger en PR hacia main
- **Pendiente:** Definir jobs de validación, tests y despliegue

---

## 4. Lo que Falta Instalar/Configurar

### 4.1 Backend (NestJS)
**Estado:** No inicializado  
**Prioridad:** Alta

**Pasos de inicialización (ejecutar desde `club-deportivo/`):**
```bash
# 1. Limpiar backend/ (eliminar archivos de información)
cd backend
rm -f db/schema.sql db/schema-guada.sql db/schema(1).sql db/persona.sql db/esquemaUltimo.sql db/Auditoria.md
# Mantener solo db/esquema-final.sql

# 2. Inicializar proyecto NestJS
pnpm init
pnpm add @nestjs/core @nestjs/common @nestjs/platform-express rxjs reflect-metadata

# 3. Instalar dependencias de desarrollo
pnpm add -D typescript @types/node ts-node @nestjs/cli

# 4. Configurar TypeScript
npx tsc --init

# 5. Instalar cliente de base de datos
pnpm add @nestjs/config @nestjs/typeorm typeorm pg

# 6. Instalar validación y DTOs
pnpm add class-validator class-transformer

# 7. Instalar autenticación
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add -D @types/passport-jwt
```

**Estructura objetivo:**
```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/           # Autenticación y JWT
│   │   ├── users/          # Gestión de usuarios
│   │   ├── persons/        # Gestión de personas
│   │   ├── courts/         # Canchas y disciplinas
│   │   ├── reservations/   # Reservas
│   │   └── equipment/      # Equipamiento
│   ├── common/
│   │   ├── guards/         # Guards de autenticación
│   │   ├── decorators/     # Decoradores personalizados
│   │   ├── interceptors/   # Interceptors
│   │   └── filters/        # Filtros de excepciones
│   ├── config/             # Configuración
│   └── main.ts             # Punto de entrada
├── db/
│   └── esquema-final.sql   # Esquema de BD (único archivo a conservar)
├── test/                   # Tests
├── nest-cli.json
├── tsconfig.json
├── .env                    # Variables de entorno (no versionado)
└── package.json
```

### 4.2 Frontend (Next.js)
**Estado:** No creado (fue eliminado)  
**Prioridad:** Alta

**Pasos de inicialización (ejecutar desde `club-deportivo/`):**
```bash
# 1. Crear proyecto Next.js dentro de club-deportivo/
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir

# 2. Instalar dependencias adicionales
cd frontend
pnpm add axios @tanstack/react-query zustand
pnpm add -D @types/node

# 3. Configurar variables de entorno
# Crear frontend/.env.local
```

**Estructura objetivo:**
```
club-deportivo/
├── frontend/                # ← Se crea con create-next-app
│   ├── src/
│   │   ├── app/             # App Router (Next.js 14+)
│   │   │   ├── (auth)/      # Rutas de autenticación
│   │   │   ├── (dashboard)/ # Rutas del dashboard
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/          # Componentes base
│   │   │   ├── forms/       # Formularios
│   │   │   └── layout/      # Layout components
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilidades
│   │   ├── services/        # API services
│   │   ├── stores/          # Estado global (Zustand)
│   │   └── types/           # Tipos TypeScript
│   ├── public/              # Assets estáticos
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── .env.local           # Variables de entorno (no versionado)
│   └── package.json
```

### 4.3 Base de datos (Supabase)
**Estado:** Esquema listo, pero no desplegado  
**Prioridad:** Alta

**Acciones requeridas:**
1. **Crear proyecto en Supabase**
   - Ir a https://supabase.com
   - Crear nuevo proyecto
   - Seleccionar región (recommended: South America)
   - Anotar: URL, anon key, service key

2. **Ejecutar esquema SQL**
   ```bash
   # Opción 1: SQL Editor de Supabase (recomendado)
   # 1. Ir a SQL Editor
   # 2. Pegar contenido de backend/db/esquema-final.sql
   # 3. Click "Run"

   # Opción 2: CLI de Supabase
   npx supabase init
   npx supabase db push
   ```

3. **Configurar variables de entorno**
   ```bash
   # backend/.env
   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   SUPABASE_URL=https://[project-ref].supabase.co
   SUPABASE_ANON_KEY=[anon-key]
   SUPABASE_SERVICE_KEY=[service-key]
   JWT_SECRET=[generar-secreto-seguro]
   JWT_EXPIRATION=24h
   PORT=3000
   ```

4. **Configurar RLS policies** (pendiente)
   ```sql
   -- Ejemplo: Políticas por rol
   -- SOCIO: puede ver/crear sus propias reservas
   -- GERENTE: puede gestionar reservas de cualquier usuario
   -- ADMINISTRADOR: acceso completo

   CREATE POLICY "socios_select_own_reservations"
   ON reservas FOR SELECT
   USING (
     auth.uid() = id_persona
     OR EXISTS (
       SELECT 1 FROM usuarios
       WHERE id_usuario = auth.uid()
       AND rol IN ('GERENTE', 'ADMINISTRADOR')
     )
   );
   ```

### 4.4 Autenticación
**Estado:** No implementada  
**Prioridad:** Alta

**Opción recomendada: Supabase Auth**
- Integración nativa con PostgreSQL
- Soporte para JWT automático
- Gestión de sesiones y refresh tokens
- Providers: Email/Password, Magic Link, OAuth

**Integración con NestJS:**
```typescript
// Ejemplo de guard
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Validar JWT de Supabase
    // Extraer usuario y rol
    // Verificar permisos
  }
}
```

### 4.5 CI/CD (GitHub Actions)
**Estado:** Configuración mínima  
**Prioridad:** Media

**Workflow completo sugerido:**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: ["main", "develop"]
  pull_request:
    branches: ["main"]

jobs:
  validate-spec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - run: pnpm install
      - run: npx openspec validate --strict

  lint:
    runs-on: ubuntu-latest
    needs: validate-spec
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: cd backend && pnpm install
      - run: cd backend && pnpm run lint
      - run: cd frontend && pnpm install
      - run: cd frontend && pnpm run lint

  test-backend:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: cd backend && pnpm install
      - run: cd backend && pnpm run test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/postgres

  deploy:
    runs-on: ubuntu-latest
    needs: [validate-spec, lint, test-backend]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      # Configurar despliegue a Vercel/Railway
```

### 4.6 Variables de Entorno
**Archivos .env necesarios:**

```bash
# backend/.env
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_KEY=[service-key]
JWT_SECRET=[generar-con-openssl-rand-base64-32]
JWT_EXPIRATION=24h
PORT=3000
NODE_ENV=development

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
```

### 4.7 Herramientas de Desarrollo
**Recomendadas:**
- **IDE:** VS Code con extensiones:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - PostgreSQL (para consultas directas)
  - Thunder Client (para testing de API)
- **API Testing:** Postman, Insomnia o Thunder Client
- **Documentación:** Swagger/OpenAPI para endpoints
- **Control de versiones:** Git con convención de commits

---

## 5. Plan de Implementación

### Fase 0: Limpieza y Configuración Inicial (1 día)
1. ✅ Eliminar archivos de información en `backend/db/`
2. ✅ Verificar Node.js >= 18 instalado
3. ✅ Verificar pnpm instalado
4. ✅ Inicializar backend NestJS
5. ✅ Inicializar frontend Next.js
6. ✅ Crear proyecto Supabase
7. ✅ Ejecutar esquema SQL en Supabase
8. ✅ Configurar variables de entorno

### Fase 1: Backend Core (1-2 semanas)
1. Configurar-TypeORM con Supabase
2. Implementar módulo de autenticación (Supabase Auth + JWT)
3. Crear CRUD para personas y usuarios
4. Implementar middlewares de autorización por rol
5. Configurar Swagger para documentación de API

### Fase 2: Backend Business Logic (2 semanas)
1. Implementar gestión de disciplinas y canchas
2. Desarrollar sistema de reservas con validaciones
3. Implementar alquiler de equipamiento con control de stock
4. Agregar auditoría y logging automático
5. Implementar funciones de cancelación y devolución

### Fase 3: Frontend Foundation (1-2 semanas)
1. Configurar layout base y navegación
2. Implementar páginas de autenticación (login, registro)
3. Crear dashboard de usuario con información personal
4. Configurar servicios API y hooks

### Fase 4: Frontend Features (2-3 semanas)
1. Desarrollar interfaz de búsqueda y reservas
2. Implementar calendario de disponibilidad
3. Crear gestión de canchas (panel admin)
4. Desarrollar sistema de pagos
5. Implementar notificaciones y alertas

### Fase 5: Integración y Testing (1 semana)
1. Integrar frontend con backend
2. Implementar tests unitarios (Jest)
3. Configurar tests de integración
4. Validar flujos completos de usuario
5. Realizar testing de seguridad

### Fase 6: Despliegue (2-3 días)
1. Configurar Vercel para frontend
2. Desplegar backend (Railway/Render/Fly.io)
3. Configurar dominio personalizado
4. Implementar monitoreo básico
5. Documentar proceso de despliegue

---

## 6. Comandos Útiles

**Todos los comandos se ejecutan desde la raíz del proyecto (`club-deportivo/`) a menos que se indique lo contrario.**

```bash
# Verificar versiones
node --version          # >= 18.0.0
pnpm --version          # >= 8.0.0

# Instalar pnpm (si no está instalado)
npm install -g pnpm

# Instalar dependencias del proyecto raíz
pnpm install

# Backend (desde club-deportivo/)
cd backend
pnpm run start:dev     # Iniciar en desarrollo
pnpm run build         # Compilar para producción
pnpm run start:prod    # Iniciar en producción
pnpm run test          # Ejecutar tests
pnpm run lint          # Verificar código
pnpm run format        # Formatear código

# Frontend (desde club-deportivo/)
cd frontend
pnpm run dev           # Iniciar servidor de desarrollo
pnpm run build         # Compilar para producción
pnpm run start         # Iniciar en producción
pnpm run lint          # Verificar código

# OpenSpec (desde club-deportivo/)
npx openspec validate --strict    # Validar especificaciones
npx openspec status               # Ver estado de cambios

# Supabase (opcional)
npx supabase init                  # Inicializar proyecto
npx supabase start                 # Iniciar local
npx supabase db push              # Sincronizar esquema
npx supabase gen types typescript # Generar tipos TypeScript
```

---

## 7. Referencias

- **NestJS:** https://docs.nestjs.com
- **Next.js:** https://nextjs.org/docs
- **Supabase:** https://supabase.com/docs
- **OpenSpec:** https://github.com/anomalyco/opencode/tree/main/packages/openspec
- **TypeScript:** https://www.typescriptlang.org/docs
- **TypeORM:** https://typeorm.io
- **Tailwind CSS:** https://tailwindcss.com/docs

---

*Documento actualizado: 2026-09-24*  
*Estado: Análisis completo con plan de implementación*  
*Próxima acción: Limpieza de backend/ e inicialización de proyecto*
