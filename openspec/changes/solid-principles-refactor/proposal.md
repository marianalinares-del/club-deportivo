## Why

El código backend actual (NestJS + TypeScript) viola varios principios SOLID, lo que dificulta el mantenimiento, testing y escalabilidad. Los servicios de dominio (`UsuariosService`, `ReservasService`, `PagosService`) concentran demasiadas responsabilidades (SRP), están fuertemente acoplados a `PrismaService` concreto (DIP), tienen lógica de estado hardcodeada (OCP), y exponen interfaces demasiado amplias (ISP). Como el proyecto está en fase MVP y crecerá, refactorizar ahora evita deuda técnica costosa.

## What Changes

- **Dividir `UsuariosService`** en 3 servicios enfocados: `UsuarioAuthService` (registro/login), `UsuarioProfileService` (perfil), `PermisoService` (solicitudes de permiso)
- **Dividir `ReservasService`** en: `ReservaCoreService` (CRUD reservas), `ReservaEstadoService` (transiciones de estado), `AlquilerEquipamientoService` (alquileres y stock)
- **Dividir `PagosService`** en: `PagoService` (pagos), `AuditoriaService` (consultas/reportes), `NotificacionService` (notificaciones)
- **Introducir interfaces de repositorio** (`IUsuarioRepository`, `IReservaRepository`, `IEquipamientoRepository`, `IPagoRepository`, `IAuditoriaRepository`) con implementaciones Prisma
- **Extraer `ReservaStateMachine`** para gestionar transiciones de estado de forma configurable/extensible
- **Refactorizar Guards** (`ActiveUserGuard`, `SuspendedUserGuard`) para depender de `IUserStatusProvider` en lugar de `PrismaService`
- **Segregar interfaces de servicio** (`IReservaReader`, `IReservaWriter`, `IAlquilerService`, etc.) para ISP

> **Nota**: Este es un refactor puro sin cambios de comportamiento externo. No se modifican APIs, contratos, ni reglas de negocio — solo la estructura interna.

## Capabilities

### New Capabilities

*(Ninguna — este cambio no introduce nuevas capacidades funcionales)*

### Modified Capabilities

*(Ninguna — al ser refactor puro con `skip_specs: true`, no hay cambios en especificaciones de comportamiento)*

## Impact

**Código afectado (Backend):**
- `backend/src/usuarios/usuarios.service.ts` → 3 nuevos servicios + módulos
- `backend/src/reservas/reservas.service.ts` → 3 nuevos servicios + módulos
- `backend/src/pagos/pagos.service.ts` → 3 nuevos servicios + módulos
- `backend/src/prisma/prisma.service.ts` → Mantenido, usado solo por implementaciones de repositorio
- `backend/src/auth/active-user.guard.ts`, `suspended-user.guard.ts` → Refactorizados para usar `IUserStatusProvider`
- Nuevos archivos: interfaces de repositorio (`backend/src/common/repositories/`), implementaciones Prisma, `ReservaStateMachine`, proveedor de estado de usuario

**APIs:** Sin cambios — contratos HTTP (DTOs, endpoints, códigos de respuesta) se mantienen idénticos

**Tests:** Requieren actualización para mockear nuevas interfaces en lugar de `PrismaService` directamente

**Base de datos:** Sin cambios — esquema SQL y triggers permanecen igual
