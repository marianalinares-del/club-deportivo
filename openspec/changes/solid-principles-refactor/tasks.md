## 1. Infraestructura: Interfaces y Repositorios Comunes

- [x] 1.1 Crear directorio `backend/src/common/repositories/interfaces/` y definir interfaces TypeScript: `IUsuarioRepository`, `IReservaRepository`, `IEquipamientoRepository`, `IPagoRepository`, `IAuditoriaRepository`, `IUserStatusProvider` — verificar con `tsc --noEmit` que compilan sin errores
- [x] 1.2 Crear directorio `backend/src/common/repositories/prisma/` e implementar cada interfaz usando `PrismaService` (ej: `UsuarioRepository`, `ReservaRepository`, etc.) — verificar que cada método delega a Prisma correctamente
- [x] 1.3 Crear `ReservaStateMachine` en `backend/src/common/state-machines/reserva.state-machine.ts` con transiciones declarativas y método `validarTransicion` — verificar con test unitario que cubre transiciones válidas e inválidas
- [x] 1.4 Crear `CommonModule` en `backend/src/common/common.module.ts` que exporte tokens de repositorio y `ReservaStateMachine` — verificar que `import { CommonModule } from '../common'` funciona en otros módulos

## 2. Refactorización: Módulo Usuarios

- [x] 2.1 Crear `UsuarioAuthService` (métodos: `register`, `login`) inyectando `IUsuarioRepository` y `JwtService` — verificar que tests unitarios existentes pasan con mocks de `IUsuarioRepository`
- [x] 2.2 Crear `UsuarioProfileService` (métodos: `getPerfil`, `updatePerfil`) inyectando `IUsuarioRepository` — verificar tests unitarios
- [x] 2.3 Crear `PermisoService` (métodos: `listarSolicitudes`, `resolverSolicitud`) inyectando `IUsuarioRepository` — verificar tests unitarios
- [x] 2.4 Crear controladores correspondientes: `UsuarioAuthController`, `UsuarioProfileController`, `PermisoController` — verificar que endpoints responden igual que antes (POST /auth/register, POST /auth/login, GET/PUT /profile, GET/PATCH /permission-requests)
- [x] 2.5 Actualizar `UsuariosModule` para importar `CommonModule`, proveer nuevos servicios y exportar tokens — verificar `pnpm run test` en módulo usuarios
- [x] 2.6 Eliminar `UsuariosService` original y su test — verificar que no hay imports rotos en el proyecto (`grep -r "UsuariosService" --include="*.ts"`)

## 3. Refactorización: Módulo Reservas

- [x] 3.1 Crear `ReservaCoreService` (métodos: `listarReservas`, `getReserva`, `crearReserva`) inyectando `IReservaRepository`, `IEquipamientoRepository`, `ReservaStateMachine` — verificar tests unitarios con mocks
- [x] 3.2 Crear `ReservaEstadoService` (métodos: `actualizarEstadoReserva`, `cancelarReservaAutogestionada`, `validarAnticipacionCancelacion`) inyectando `IReservaRepository`, `ReservaStateMachine` — verificar tests unitarios incluyendo validación de 24h anticipación
- [x] 3.3 Crear `AlquilerEquipamientoService` (métodos: `listarAlquileres`, `listarEquipamientos`, `crearAlquiler`, `procesarDevolucion`) inyectando `IReservaRepository`, `IEquipamientoRepository` — verificar tests unitarios incluyendo stock y validaciones de disciplina
- [x] 3.4 Crear controladores: `ReservaCoreController`, `ReservaEstadoController`, `AlquilerEquipamientoController` — verificar endpoints: GET/POST /reservations, PATCH /reservations/:id/status, DELETE /reservations/:id, GET /equipment, GET/POST/PATCH /equipment-rentals
- [x] 3.5 Actualizar `ReservasModule` para importar `CommonModule`, proveer nuevos servicios — verificar `pnpm run test` en módulo reservas
- [x] 3.6 Eliminar `ReservasService` original y su test — verificar que no hay imports rotos

## 4. Refactorización: Módulo Pagos

- [x] 4.1 Crear `PagoService` (métodos: `crearPago`, `getPagosReserva`, `listarPagos`) inyectando `IReservaRepository`, `IPagoRepository` — verificar tests unitarios
- [x] 4.2 Crear `AuditoriaService` (métodos: `getAuditoria`, `getReporteAuditoria`) inyectando `IAuditoriaRepository` — verificar tests unitarios
- [x] 4.3 Crear `NotificacionService` (método: `enviarNotificacion`) inyectando `IUsuarioRepository`, `IAuditoriaRepository` — verificar tests unitarios
- [x] 4.4 Crear controladores: `PagoController`, `AuditoriaController`, `NotificacionController` — verificar endpoints: POST /payments, GET /payments, GET /audit-logs, GET /audit-logs/report, POST /notifications
- [x] 4.5 Actualizar `PagosModule` para importar `CommonModule`, proveer nuevos servicios — verificar `pnpm run test` en módulo pagos
- [x] 4.6 Eliminar `PagosService` original y su test — verificar que no hay imports rotos

## 5. Refactorización: Guards de Autenticación

- [x] 5.1 Actualizar `ActiveUserGuard` para inyectar `IUserStatusProvider` en lugar de `PrismaService` — verificar test unitario que mockea `IUserStatusProvider`
- [x] 5.2 Actualizar `SuspendedUserGuard` para inyectar `IUserStatusProvider` — verificar test unitario
- [x] 5.3 Registrar implementación Prisma de `IUserStatusProvider` en `AuthModule` o `CommonModule` — verificar que guards funcionan en integración (login + acceso a endpoint protegido)

## 6. Actualización de Tests y Validación

- [x] 6.1 Actualizar tests unitarios de `UsuariosModule` para mockear interfaces nuevas (`IUsuarioRepository`) en lugar de `PrismaService` — verificar `pnpm run test` pasa
- [x] 6.2 Actualizar tests unitarios de `ReservasModule` para mockear `IReservaRepository`, `IEquipamientoRepository`, `ReservaStateMachine` — verificar `pnpm run test` pasa
- [x] 6.3 Actualizar tests unitarios de `PagosModule` para mockear `IPagoRepository`, `IAuditoriaRepository`, `IReservaRepository` — verificar `pnpm run test` pasa
- [x] 6.4 Actualizar tests unitarios de `AuthModule` (guards) para mockear `IUserStatusProvider` — verificar `pnpm run test` pasa
- [x] 6.5 Ejecutar suite completa de tests: `cd backend && pnpm run test` — verificar 0 fallos
- [x] 6.6 Ejecutar lint y typecheck: `cd backend && pnpm run lint && pnpm run typecheck` — verificar 0 errores
- [x] 6.7 Ejecutar validación OpenSpec: `npx openspec validate --strict` — verificar que pasa

## 7. Verificación de Integración (E2E)

- [ ] 7.1 Ejecutar tests E2E: `cd backend && pnpm run test:e2e` — verificar que todos los flujos críticos funcionan (registro, login, reserva, alquiler, pago, auditoría)
- [ ] 7.2 Verificar manualmente endpoints clave con curl/Postman: POST /auth/register, POST /auth/login, GET /profile, POST /reservations, PATCH /reservations/:id/status, POST /equipment-rentals, POST /payments, GET /audit-logs
- [x] 7.3 Confirmar que no hay cambios en contratos HTTP (códigos de respuesta, estructura JSON, headers) comparando con versión anterior
