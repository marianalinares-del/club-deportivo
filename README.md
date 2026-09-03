# Sistema de Reservas - Club Deportivo

MVP para una plataforma de reservas de un club deportivo. Desarrollado en equipo bajo un enfoque **API-First**, utilizando **OpenSpec** para la definición del contrato de la API y **CI/CD** con GitHub Actions para validación e integración continua.

## Descripción

El sistema permite la gestión de reservas de canchas por disciplina (Tenis, Fútbol, Pádel), incluye control de aforo por franja horaria, alquiler de equipamiento deportivo, y diferenciación de actores con permisos específicos (Socio, Gerente y Administrador).

### Roles y funciones principales

- **Socio / Usuario Final**: se autoregistra, visualiza agendas libres, reserva y cancela con anticipación, y edita sus datos de contacto.
- **Gerente**: gestiona altas de socios, reservas (socios o no socios), stock y devoluciones de equipamiento, check-in y finalización de turnos en Secretaría.
- **Administrador**: todas las funciones del Gerente, más la gestión completa del catálogo (disciplinas/canchas), alta de personal, reactivación de cuentas suspendidas y auditoría.
- **No Socio (Invitado)**: persona sin cuenta que puede tener una reserva asignada, siempre cargada por Gerencia/Administración.

### Dominios deportivos

- Canchas por disciplina: Tenis, Fútbol, Pádel.
- Franjas horarias y turnos.
- Alquiler de equipamiento deportivo.

## Stack tecnológico

| Capa        | Tecnología                       |
|-------------|----------------------------------|
| Frontend    | Next.js, TypeScript              |
| Backend     | NestJS, TypeScript               |
| Base de datos | PostgreSQL (Supabase)          |
| Especificación | OpenSpec                      |
| CI/CD       | GitHub Actions                    |

## Arquitectura

Enfoque **API-First**: el contrato de la API se define desde el inicio mediante **OpenSpec**, y a partir de la especificación se desarrollan backend y frontend. Se prioriza el diseño de arquitectura, el control de versiones colaborativo (Git) y la automatización de la validación y el despliegue (CI/CD).

### Estructura del proyecto

```
Ing Software_grupo/
├── backend/                    # API y lógica de negocio (NestJS)
├── frontend/                   # Interfaz de usuario (Next.js)
├── specs/                      # Especificaciones OpenSpec (contratos de la API)
├── docs/                       # Documentación adicional
├── .github/
│   └── workflows/              # Pipelines de CI/CD (GitHub Actions)
├── .gitignore
└── README.md
```

## Flujo de trabajo Git

- La rama `main` está protegida: toda integración requiere un Pull Request (PR) con al menos una revisión aprobada por un compañero de equipo.
- Cada nueva especificación o funcionalidad se desarrolla en una rama independiente, por ejemplo:
  - `feature/spec-reserva-vip`
  - `feature/cancelacion-turnos`
  - `feature/check-in-secretaria`

## Integración continua (CI/CD)

Pendiente de configuración (Fase 3). Se desplegará un workflow en `.github/workflows/ci.yml` que se ejecutará en cada Pull Request y commit hacia `main` para:

- Validar / corregir los archivos de especificación de OpenSpec.
- Ejecutar pruebas unitarias o de integración del código base.
- Bloquear automáticamente el merge si las pruebas o la validación de OpenSpec fallan.

## Requisitos funcionales clave

- Consulta de disponibilidad filtrada por disciplina, fecha y franja horaria.
- Creación, consulta y cancelación de reservas con validaciones de negocio (anticipación, no solapamiento, límite de reservas vigentes, stock de equipamiento).
- Check-in y finalización de turno en Secretaría.
- Gestión de stock y devoluciones de equipamiento con control de demoras.
- Auditoría de acciones y trazabilidad de eventos.
- Regla de negocio: toda reserva pertenece exclusivamente a un Socio **o** a un No Socio (exactamente uno de ambos).

## Instrucciones de ejecución

> Se completarán a medida que se implementen backend y frontend.

### Backend (NestJS)

```bash
cd backend
npm install
npm run start:dev
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

### Base de datos

Se utilizará PostgreSQL a través de Supabase. La configuración de conexión se cargará por variables de entorno (`.env`), no versionadas.

## Contribución

Trabajo grupal colaborativo mediante Pull Requests. Toda funcionalidad debe:

1. Crear una rama independiente desde `main`.
2. Implementar el cambio siguiendo la especificación OpenSpec.
3. Abrir un Pull Request hacia `main`.
4. Obtener al menos una revisión aprobada.
5. Esperar el resultado de la validación de CI/CD antes de integrar.

## Estado del proyecto

En etapa inicial: estructura del repositorio definida, especificación de OpenSpec y modelos en preparación (Fase 2).