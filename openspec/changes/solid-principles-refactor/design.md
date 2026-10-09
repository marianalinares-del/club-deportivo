## Context

El backend actual es una aplicación NestJS con 6 módulos principales (`UsuariosModule`, `ReservasModule`, `InstalacionesModule`, `PagosModule`, `AuthModule`, `PrismaModule`). Los servicios de dominio violan SRP (servicios de 250-500+ líneas con 4-6 responsabilidades), DIP (inyectan `PrismaService` concreto), OCP (lógica de estado hardcodeada), e ISP (interfaces amplias). Los guards de autenticación también dependen directamente de Prisma.

La base de datos usa PostgreSQL/Supabase con triggers para reglas de negocio (stock, auditoría, disponibilidad). El esquema es autoritativo (`backend/db/esquema-final.sql`).

## Goals / Non-Goals

**Goals:**
- Separar responsabilidades en servicios pequeños y cohesivos (SRP)
- Introducir abstracciones de repositorio para desacoplar dominio de ORM (DIP)
- Hacer transiciones de estado extensibles sin modificar código existente (OCP)
- Segregar interfaces de servicio para que consumidores dependan solo de lo que usan (ISP)
- Mantener compatibilidad total con API existente (endpoints, DTOs, códigos HTTP)
- Facilitar testing unitario con mocks de interfaces en lugar de Prisma real

**Non-Goals:**
- Cambiar esquema de base de datos, triggers, o reglas de negocio
- Modificar contratos HTTP (endpoints, DTOs, responses)
- Introducir nuevos frameworks o patrones arquitectónicos (CQRS, Event Sourcing, etc.)
- Refactorizar `InstalacionesService` (cumple SRP aceptablemente)
- Cambiar frontend (Next.js) — solo backend

## Decisions

### 1. Estructura de nuevos servicios y módulos

**Decisión**: Crear nuevos módulos por cada servicio extraído, manteniendo la convención actual de NestJS.

**Alternativas consideradas:**
- *Mantener módulos existentes y solo dividir servicios internamente*: Rechazado — viola encapsulamiento de módulo y dificulta testing aislado.
- *Un solo módulo `DomainModule` con todos los servicios*: Rechazado — acopla dominios no relacionados.

**Estructura resultante:**
```
src/
├── usuarios/
│   ├── auth/              # UsuarioAuthService, UsuarioAuthController
│   ├── profile/           # UsuarioProfileService, UsuarioProfileController
│   ├── permisos/          # PermisoService, PermisoController
│   └── usuarios.module.ts # Importa los 3 submódulos
├── reservas/
│   ├── core/              # ReservaCoreService, ReservaCoreController
│   ├── estado/            # ReservaEstadoService, ReservaEstadoController
│   ├── alquiler/          # AlquilerEquipamientoService, AlquilerEquipamientoController
│   └── reservas.module.ts # Importa los 3 submódulos
├── pagos/
│   ├── pagos/             # PagoService, PagoController
│   ├── auditoria/         # AuditoriaService, AuditoriaController
│   ├── notificaciones/    # NotificacionService, NotificacionController
│   └── pagos.module.ts    # Importa los 3 submódulos
├── common/
│   └── repositories/      # Interfaces + implementaciones Prisma
│       ├── interfaces/
│       │   ├── i-usuario.repository.ts
│       │   ├── i-reserva.repository.ts
│       │   ├── i-equipamiento.repository.ts
│       │   ├── i-pago.repository.ts
│       │   └── i-auditoria.repository.ts
│       └── prisma/
│           ├── usuario.repository.ts
│           ├── reserva.repository.ts
│           ├── equipamiento.repository.ts
│           ├── pago.repository.ts
│           └── auditoria.repository.ts
└── auth/
    └── guards/
        └── user-status.provider.ts  # IUserStatusProvider interface
```

### 2. Interfaces de Repositorio (DIP)

**Decisión**: Definir interfaces TypeScript en `src/common/repositories/interfaces/` con métodos mínimos necesarios por cada servicio. Implementaciones en `src/common/repositories/prisma/`.

**Rationale**: 
- Interfaces expresan *qué* necesita el dominio, no *cómo* se persiste
- Permite testear servicios con mocks en memoria
- Futuro: permite cambiar ORM o añadir caché sin tocar servicios

**Ejemplo `IReservaRepository`:**
```typescript
interface IReservaRepository {
  findById(id: string): Promise<Reserva | null>;
  findMany(filtros: ReservaFiltros): Promise<Reserva[]>;
  create(data: CreateReservaData): Promise<Reserva>;
  updateEstado(id: string, estado: ReservaEstado): Promise<Reserva>;
  countConfirmadasByPersona(idPersona: string): Promise<number>;
  findConflicto(idFranja: string, fecha: Date): Promise<Reserva | null>;
}
```

### 3. ReservaStateMachine (OCP)

**Decisión**: Extraer lógica de transiciones de estado a clase dedicada `ReservaStateMachine` con configuración declarativa.

**Implementación:**
```typescript
class ReservaStateMachine {
  private static readonly TRANSICIONES: Record<ReservaEstado, ReservaEstado[]> = {
    CONFIRMADA: ['EN_CURSO', 'CANCELADA'],
    EN_CURSO: ['COMPLETADA', 'CANCELADA'],
    // COMPLETADA, CANCELADA: [] (estados terminales)
  };

  static validarTransicion(estadoActual: ReservaEstado, nuevoEstado: ReservaEstado, reserva: Reserva): void {
    const permitidas = this.TRANSICIONES[estadoActual] || [];
    if (!permitidas.includes(nuevoEstado)) {
      throw new BadRequestException(`Transición inválida: ${estadoActual} -> ${nuevoEstado}`);
    }
    // Validaciones adicionales (ej. anticipación cancelación)
  }

  static getEstadosPermitidos(estadoActual: ReservaEstado): ReservaEstado[] {
    return [...this.TRANSICIONES[estadoActual] || []];
  }
}
```

**Ventaja**: Añadir nuevo estado = modificar solo esta clase, no tocar servicios.

### 4. IUserStatusProvider para Guards

**Decisión**: Crear interfaz `IUserStatusProvider` que los guards usen, con implementación Prisma inyectada.

```typescript
interface IUserStatusProvider {
  getEstado(userId: string): Promise<UsuarioEstado | null>;
  getRol(userId: string): Promise<UsuarioRol | null>;
}
```

**Guards refactorizados:**
- `ActiveUserGuard` → inyecta `IUserStatusProvider`, verifica `estado === 'ACTIVO'`
- `SuspendedUserGuard` → inyecta `IUserStatusProvider`, bloquea si `estado === 'SUSPENDIDO'`

### 5. Segregación de Interfaces de Servicio (ISP)

**Decisión**: Definir interfaces granulares por capacidad de lectura/escritura.

```typescript
// Reservas
interface IReservaReader { listarReservas, getReserva }
interface IReservaWriter { crearReserva, actualizarEstado, cancelarAutogestionada }
interface IAlquilerService { listarAlquileres, crearAlquiler, procesarDevolucion }

// Usuarios
interface IUsuarioAuth { register, login }
interface IUsuarioProfile { getPerfil, updatePerfil }
interface IPermisoService { listarSolicitudes, resolverSolicitud }

// Pagos
interface IPagoService { crearPago, getPagosReserva, listarPagos }
interface IAuditoriaService { getAuditoria, getReporteAuditoria }
interface INotificacionService { enviarNotificacion }
```

Controladores inyectan solo la interfaz que necesitan.

### 6. Inyección de Dependencias en Módulos

**Decisión**: Usar tokens personalizados de NestJS para bind interfaces a implementaciones.

```typescript
// En cada module.ts
providers: [
  { provide: 'IUsuarioRepository', useClass: UsuarioRepository },
  { provide: 'IReservaRepository', useClass: ReservaRepository },
  // ...
  UsuarioAuthService,  // inyecta 'IUsuarioRepository'
],
exports: ['IUsuarioRepository', 'IReservaRepository', ...]
```

## Risks / Trade-offs

| Riesgo | Mitigación |
|--------|------------|
| **Aumento de archivos/módulos** | Convención clara de命名; estructura predecible por dominio |
| **Curva de aprendizaje para el equipo** | Documentar patrones en README del proyecto; pair programming inicial |
| **Tests existentes rotos** | Actualizar mocks en tests unitarios para usar interfaces; tests E2E sin cambios |
| **Over-engineering para MVP** | Limitar a dominios problemáticos identificados; no refactorizar `InstalacionesModule` |
| **Ciclos de dependencia entre repositorios** | Repositorios solo leen/escriben su entidad; relaciones vía IDs, no objetos completos |

## Migration Plan

1. **Fase 1 - Infraestructura**: Crear interfaces y implementaciones Prisma en `common/repositories/`
2. **Fase 2 - Usuarios**: Extraer `UsuarioAuthService`, `UsuarioProfileService`, `PermisoService`; actualizar `UsuariosModule` y controladores
3. **Fase 3 - Reservas**: Extraer `ReservaCoreService`, `ReservaEstadoService`, `AlquilerEquipamientoService`; crear `ReservaStateMachine`; actualizar `ReservasModule`
4. **Fase 4 - Pagos**: Extraer `PagoService`, `AuditoriaService`, `NotificacionService`; actualizar `PagosModule`
5. **Fase 5 - Guards**: Refactorizar `ActiveUserGuard`, `SuspendedUserGuard` para usar `IUserStatusProvider`
6. **Fase 6 - Tests**: Actualizar mocks en tests unitarios
7. **Fase 7 - Validación**: Ejecutar suite completa + `openspec validate --strict`

**Rollback**: Cada fase en commit separado; `git revert` por fase si hay regresiones.

## Open Questions

- ¿Se debe crear un módulo `CommonModule` que exporte todos los tokens de repositorio, o cada módulo importa lo que necesita? → **Decisión provisional**: Cada módulo importa sus repositorios directamente para acoplamiento explícito.
- ¿Manejar transacciones multi-repositorio (ej. reserva + alquiler + stock)? → **Decisión provisional**: Servicios coordinan transacciones via `PrismaService.$transaction()` inyectado directamente (excepción controlada a DIP para transacciones).
