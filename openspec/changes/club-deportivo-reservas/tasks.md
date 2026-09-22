# Tasks

## 1. Gestión de Usuarios y Personas

- [ ] 1.1 Configurar estructura del módulo `gestión-usuarios-personas` y verificar archivos esperados
- [ ] 1.2 Implementar controladores de registro de usuarios según esquema SQL `persona.sql`
- [ ] 1.3 Implementar controladores de autenticación y generación de tokens JWT
- [ ] 1.4 Crear endpoints POST /api/v1/auth/register y POST /api/v1/auth/login
- [ ] 1.5 Implementar middleware de autorización por rol (socio, gerente, administrador, invitado)
- [ ] 1.6 Probar endpoints de autenticación con casos de éxito y error
- [ ] 1.7 Implementar validación de usuarios suspendidos (bloqueo de reservas y alquileres)
- [ ] 1.8 Probar control de roles y permisos por escenario

## 2. Gestión de Instalaciones y Horarios

- [ ] 2.1 Configurar estructura del módulo `gestión-instalaciones-horarios`
- [ ] 2.2 Implementar CRUD de disciplinas deportivas (POST, GET, PUT, DELETE /api/v1/disciplines)
- [ ] 2.3 Implementar CRUD de canchas asociadas a disciplinas (/api/v1/courts)
- [ ] 2.4 Crear endpoints de franjas horarias (/api/v1/time-slots) con validación de disponibilidad
- [ ] 2.5 Integrar validación con esquemas SQL `esquemaUltimo.sql` y `esquema-final.sql`
- [ ] 2.6 Probar gestión de canchas y horarios con casos de borde
- [ ] 2.7 Implementar validación de disciplinas soportadas (Tenis, Fútbol, Pádel)
- [ ] 2.8 Probar creación de disciplinas y canchas por escenario

## 3. Gestión de Reservas y Turnos

- [ ] 3.1 Configurar estructura del módulo `gestión-reservas-turnos`
- [ ] 3.2 Implementar creación de reservas principales (POST /api/v1/reservations)
- [ ] 3.3 Implementar endpoints de consulta de reservas por usuario y fecha (/api/v1/reservations)
- [ ] 3.4 Implementar alquiler de equipamiento asociado a reservas (/api/v1/equipment-rentals)
- [ ] 3.5 Validar conflictos de tiempo y evitar dobles reservas
- [ ] 3.6 Implementar procesamiento de devoluciones de equipamiento
- [ ] 3.7 Implementar validación XOR de propietario de reserva (socio O invitado, nunca ambos)
- [ ] 3.8 Probar creación de reservas y manejo de conflictos
- [ ] 3.9 Implementar validación de stock en tiempo real para equipamiento
- [ ] 3.10 Probar flujo de reserva con validación de stock y conflictos

## 4. Pagos, Auditoría y Notificaciones

- [ ] 4.1 Configurar estructura del módulo `pagos-auditoria-notificaciones`
- [ ] 4.2 Implementar registro de pagos asociados a reservas (/api/v1/payments)
- [ ] 4.3 Implementar consulta de estado de pagos (pending, completed, failed, refunded)
- [ ] 4.4 Crear sistema de auditoría de actividades del usuario (/api/v1/audit-logs)
- [ ] 4.5 Implementar notificaciones por email para confirmaciones de reserva
- [ ] 4.6 Implementar notificaciones de estado de pago y recordatorios
- [ ] 4.7 Implementar validación de stock en tiempo real para equipamiento
- [ ] 4.8 Implementar bloqueo de usuarios suspendidos (prohibir reservas y alquileres)
- [ ] 4.9 Probar flujo de pagos y notificaciones completas
- [ ] 4.10 Probar bloqueo de usuario suspendido en operaciones de reserva y rental

## 5. Integración y Validación

- [ ] 5.1 Generar servidores cliente y stubs a partir de specifications OpenAPI
- [ ] 5.2 Configurar validación OpenAPI en pipeline CI (pre-commit hook)
- [ ] 5.3 Probar integración entre los 4 módulos en entorno de pruebas
- [ ] 5.4 Ejecutar `openspec validate --strict` y corregir cualquier inconsistencia
- [ ] 5.5 Desplegar versión de prueba y verificar endpoints integrados
- [ ] 5.6 Verificar validación XOR en operaciones de reserva
- [ ] 5.7 Verificar bloqueo de usuario suspendido en todas las operaciones
- [ ] 5.8 Verificar validación de stock en tiempo real en escenarios de rental