# Design

## Context

This design for the Sports Club Reservation System follows the specifications defined in the proposal.md and the 4 module specs (gestion-usuarios-personas, gestion-instalaciones-horarios, gestion-reservas-turnos, pagos-auditoria-notificaciones). All endpoints are designed using OpenAPI 3.0 and follow REST conventions.

The architecture supports 4 independent feature branches working in parallel without conflict, allowing the 4 team members to develop their modules concurrently.

## Goals / Non-Goals

**Goals:**
- Define complete OpenAPI 3.0 contracts for all 4 modules
- Enable parallel development in separate Git branches
- Support CI/CD pipelines for API validation and deployment
- Use role-based access control with XOR reservation ownership
- Implement real-time stock validation for equipment rentals
- Support suspended user prevention logic
- Provide clear integration points between modules

**Non-Goals:**
- Implementation of business logic (belongs in implementation phase)
- Database migration scripts (SQL files are source of truth)
- UI components or client applications
- Specific authentication implementation details (OAuth2, JWT configs)
- Exact payment gateway integration details

## Decisions

### API Specification Format: OpenAPI 3.0

Chosen for its industry-wide adoption, tooling support, and code generation capabilities. Enables server stubs and client SDK generation in multiple languages.

### Module Separation by Feature Branch

Each module developed in independent branch to avoid merge conflicts:
- `gestión-usuarios-personas` → `feature/integrante-1` (Integrante 1: Gestión de usuarios y roles)
- `gestión-instalaciones-horarios` → `feature/integrante-2` (Integrante 3: Gestión de instalaciones y horarios)
- `gestión-reservas-turnos` → `feature/integrante-3` (Integrante 2: Creación y mantenimiento de reservas)
- `pagos-auditoria-notificaciones` → `feature/integrante-4` (Integrante 4: Pagos, auditoría y generación de reportes)

### RESTful Conventions

All endpoints follow REST conventions with JSON request/response bodies. HTTP methods mapped to operations:
- GET → Read/List operations
- POST → Create operations
- PUT/PATCH → Update operations
- DELETE → Remove operations

### Role-Based Access Control with XOR Ownership

Each reservation belongs exclusively to a socio OR invitado (XOR), never both. The system enforces this constraint at the API level with validation on reservation creation and modification.

### Real-Time Stock Validation

Equipment rental requests must validate available stock in real-time before creating the rental. The system rejects rentals if insufficient stock exists and increments stock count after equipment return.

### Suspended User Prevention

Users with suspended status cannot perform any reservation or equipment rental. This check occurs at API gateway level before processing any create operations.

## Risks / Trade-offs

- **Risk**: Module coupling if API contracts change after branch divergence
  - **Mitigation**: Freeze API specs before branch creation; use openspec validate before merging

- **Risk**: Inconsistent interpretation of XOR constraint across branches
  - **Mitigation**: All branches use same spec files as source of truth; validate with openspec validate --strict

- **Risk**: Real-time stock validation race conditions
  - **Mitigation**: Implement database-level locking or optimistic concurrency control for stock updates

- **Trade-off**: Development speed vs. specification completeness
  - **Decision**: Prioritize complete OpenAPI specs first, implement incrementally

## Open Questions

- None (all requirements resolved in proposal and specs phases)

---

*Design generated following spec-driven workflow for club-deportivo-reservas change*
*Reference proposal.md for business motivation and scope*
*Reference specs/*.md for detailed requirements per module*