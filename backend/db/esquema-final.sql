-- =====================================================================
-- Club Deportivo — Sistema de Reservas
-- ESQUEMA FINAL UNIFICADO (PostgreSQL 14+ / Supabase)
--
-- Fuente de verdad: docs/modelo-datos.md
-- Este script combina y corrige backend/db/schema.sql (v1, SERIAL) y
-- backend/db/schema-guada.sql (v2, UUID + triggers), resolviendo las
-- brechas detectadas en la auditoría (ver detalle en la respuesta del
-- asistente). Es idempotente: puede ejecutarse repetidas veces.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- =====================================================================
-- 0. LIMPIEZA (orden inverso a las dependencias)
-- =====================================================================
DROP VIEW IF EXISTS v_reservas_detalle CASCADE;

DROP TABLE IF EXISTS registros_auditoria           CASCADE;
DROP TABLE IF EXISTS detalle_alquiler_equipamiento CASCADE;
DROP TABLE IF EXISTS reservas                       CASCADE;
DROP TABLE IF EXISTS equipamientos                  CASCADE;
DROP TABLE IF EXISTS franjas_horarias               CASCADE;
DROP TABLE IF EXISTS canchas                        CASCADE;
DROP TABLE IF EXISTS no_socios                       CASCADE;
DROP TABLE IF EXISTS solicitudes_permiso            CASCADE;
DROP TABLE IF EXISTS usuarios                       CASCADE;
DROP TABLE IF EXISTS disciplinas                    CASCADE;

DROP FUNCTION IF EXISTS fn_check_gestor_rol()               CASCADE;
DROP FUNCTION IF EXISTS fn_check_max_reservas_activas()      CASCADE;
DROP FUNCTION IF EXISTS fn_set_fecha_devolucion_estimada()   CASCADE;
DROP FUNCTION IF EXISTS fn_validar_alquiler_equipamiento()   CASCADE;
DROP FUNCTION IF EXISTS fn_gestionar_devolucion_equipamiento() CASCADE;
DROP FUNCTION IF EXISTS fn_cancha_a_mantenimiento()          CASCADE;
DROP FUNCTION IF EXISTS fn_auditoria_reserva()               CASCADE;
DROP FUNCTION IF EXISTS fn_marcar_no_devueltos()             CASCADE;

-- =====================================================================
-- 1. DISCIPLINAS
-- =====================================================================
CREATE TABLE disciplinas (
    id_disciplina UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        TEXT NOT NULL UNIQUE,           -- Fútbol, Tenis, Pádel (RF01)
    descripcion   TEXT,
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE disciplinas IS 'Catálogo de disciplinas deportivas (RF01).';

-- =====================================================================
-- 2. USUARIOS (Socios, Gerentes, Administradores)
-- =====================================================================
CREATE TABLE usuarios (
    id_usuario                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rol                          TEXT NOT NULL DEFAULT 'SOCIO'
        CHECK (rol IN ('SOCIO', 'GERENTE', 'ADMINISTRADOR')),
    estado                       TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'ACTIVO', 'SUSPENDIDO')),
    -- Datos fijos, editables solo por Gerente/Admin (RF19.2)
    dni                          TEXT NOT NULL UNIQUE,
    nombre                       TEXT NOT NULL,
    apellido                     TEXT NOT NULL,
    fecha_nacimiento             DATE NOT NULL,
    -- Datos de contacto, editables por el propio socio (RF19.1)
    email                        TEXT NOT NULL UNIQUE,
    telefono                     TEXT NOT NULL,
    domicilio                    TEXT,
    -- Autenticación (si no se delega 100% en Supabase Auth)
    password_hash                TEXT,
    incumplimientos_equipamiento INT NOT NULL DEFAULT 0 CHECK (incumplimientos_equipamiento >= 0), -- RF13.4
    creado_en                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en               TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE usuarios IS 'Socios, Gerentes y Administradores (RF06, RF11, RF17, RF19).';
COMMENT ON COLUMN usuarios.estado IS 'PENDIENTE: no reserva ni alquila (RF17.1). SUSPENDIDO: no crea reservas nuevas (RF17.2).';
COMMENT ON COLUMN usuarios.incumplimientos_equipamiento IS 'Contador de no-devoluciones/tardías; 3 incumplimientos suspenden la cuenta (RF13.4).';

-- =====================================================================
-- 3. SOLICITUDES DE PERMISO (1:1 con el usuario que eventualmente generan)
-- =====================================================================
CREATE TABLE solicitudes_permiso (
    id_solicitud        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre               TEXT NOT NULL,
    apellido             TEXT NOT NULL,
    email                TEXT NOT NULL UNIQUE,
    telefono             TEXT NOT NULL,
    dni                  TEXT NOT NULL,
    origen               TEXT NOT NULL
        CHECK (origen IN ('AUTOREGISTRO', 'GESTIONADA_POR_PERSONAL')),
    estado               TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
    id_gestor_aprobador  UUID REFERENCES usuarios(id_usuario),
    id_usuario_generado  UUID UNIQUE REFERENCES usuarios(id_usuario), -- 1:1 con el usuario creado
    fecha_solicitud       TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_resolucion      TIMESTAMPTZ,
    -- Coherencia: solo hay usuario generado si la solicitud fue aprobada
    CONSTRAINT ck_solicitud_usuario_si_aprobada CHECK (
        (estado = 'APROBADA' AND id_usuario_generado IS NOT NULL)
        OR (estado <> 'APROBADA' AND id_usuario_generado IS NULL)
    )
);
COMMENT ON TABLE solicitudes_permiso IS 'Alta de socio por autoregistro o gestionada por personal (RF11).';

-- Un CHECK no puede consultar otra tabla: se valida por trigger que el
-- aprobador sea Gerente o Administrador.
CREATE OR REPLACE FUNCTION fn_check_gestor_rol()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_gestor_aprobador IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM usuarios
            WHERE id_usuario = NEW.id_gestor_aprobador
              AND rol IN ('GERENTE', 'ADMINISTRADOR')
        ) THEN
            RAISE EXCEPTION 'id_gestor_aprobador debe pertenecer a un Gerente o Administrador';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_gestor_rol
    BEFORE INSERT OR UPDATE ON solicitudes_permiso
    FOR EACH ROW EXECUTE FUNCTION fn_check_gestor_rol();

-- =====================================================================
-- 4. NO SOCIOS (invitados)
-- =====================================================================
CREATE TABLE no_socios (
    id_no_socio UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni         TEXT UNIQUE,           -- evita duplicar el mismo invitado
    nombre      TEXT NOT NULL,
    apellido    TEXT,
    telefono    TEXT NOT NULL,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE no_socios IS 'Invitados con reserva cargada por Gerencia (RF21).';

-- =====================================================================
-- 5. CANCHAS
-- =====================================================================
CREATE TABLE canchas (
    id_cancha     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_disciplina UUID NOT NULL REFERENCES disciplinas(id_disciplina),
    nombre        TEXT NOT NULL,
    superficie    TEXT,
    precio_base   NUMERIC(10,2) NOT NULL CHECK (precio_base >= 0),
    estado        TEXT NOT NULL DEFAULT 'DISPONIBLE'
        CHECK (estado IN ('DISPONIBLE', 'MANTENIMIENTO')),
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_disciplina, nombre)
);
COMMENT ON TABLE canchas IS 'Cancha con disciplina, superficie, estado y precio (RF01, RF15).';

-- =====================================================================
-- 6. FRANJAS HORARIAS
--    Grilla RECURRENTE por cancha (día de semana + rango horario).
--    La fecha puntual de cada ocurrencia vive en reservas.fecha.
-- =====================================================================
CREATE TABLE franjas_horarias (
    id_franja   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_cancha   UUID NOT NULL REFERENCES canchas(id_cancha) ON DELETE CASCADE,
    dia_semana  SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=domingo ... 6=sábado
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL CHECK (hora_fin > hora_inicio),
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_cancha, dia_semana, hora_inicio)
);
COMMENT ON TABLE franjas_horarias IS 'Grilla de turnos por cancha (RF02, RF03).';

-- =====================================================================
-- 7. EQUIPAMIENTOS
-- =====================================================================
CREATE TABLE equipamientos (
    id_equipamiento  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_disciplina    UUID NOT NULL REFERENCES disciplinas(id_disciplina), -- soporta RF12.2
    nombre           TEXT NOT NULL,
    stock_total      INT NOT NULL CHECK (stock_total >= 0),
    stock_disponible INT NOT NULL CHECK (stock_disponible >= 0),
    precio_alquiler  NUMERIC(10,2) NOT NULL CHECK (precio_alquiler >= 0),
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (stock_disponible <= stock_total)
);
COMMENT ON TABLE equipamientos IS 'Artículos deportivos con stock y precio de alquiler (RF12, RF13).';

-- =====================================================================
-- 8. RESERVAS
--    id_cancha se deriva de id_franja -> id_cancha (evita inconsistencia
--    cancha-vs-franja); XOR socio/no-socio.
-- =====================================================================
CREATE TABLE reservas (
    id_reserva     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_franja      UUID NOT NULL REFERENCES franjas_horarias(id_franja),
    fecha          DATE NOT NULL,
    id_usuario     UUID REFERENCES usuarios(id_usuario),
    id_no_socio    UUID REFERENCES no_socios(id_no_socio),
    estado         TEXT NOT NULL DEFAULT 'CONFIRMADA'
        CHECK (estado IN ('CONFIRMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA')),
    origen         TEXT NOT NULL DEFAULT 'AUTOGESTIONADA'
        CHECK (origen IN ('AUTOGESTIONADA', 'MANUAL_GERENCIA')),
    monto_total    NUMERIC(10,2) NOT NULL CHECK (monto_total >= 0),
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelado_en   TIMESTAMPTZ,
    -- 3.1 XOR de reservante: exactamente uno de socio / no socio
    CONSTRAINT ck_reserva_unico_reservante CHECK (
        (id_usuario IS NOT NULL AND id_no_socio IS NULL)
        OR
        (id_usuario IS NULL AND id_no_socio IS NOT NULL)
    )
);
COMMENT ON TABLE reservas IS 'Reserva de una franja por socio o no socio (RF02-RF05, RF07-RF10, RF16-RF18, RF20, RF22).';

-- Unicidad real de "franja ocupada": solo los estados que efectivamente
-- ocupan el turno bloquean el slot. CANCELADA/COMPLETADA no bloquean
-- reservas históricas futuras sobre el mismo slot (corrige el UNIQUE
-- (id_cancha, id_franja, fecha, estado) de schema.sql v1, que impedía
-- volver a reservar un turno luego de cancelarlo dos veces).
CREATE UNIQUE INDEX uq_franja_ocupada
    ON reservas (id_franja, fecha)
    WHERE estado IN ('CONFIRMADA', 'EN_CURSO');

-- Índices estratégicos para disponibilidad de canchas / franjas
CREATE INDEX idx_reservas_fecha              ON reservas (fecha);
CREATE INDEX idx_reservas_usuario_estado     ON reservas (id_usuario, estado) WHERE id_usuario IS NOT NULL;
CREATE INDEX idx_reservas_no_socio           ON reservas (id_no_socio) WHERE id_no_socio IS NOT NULL;
CREATE INDEX idx_franjas_cancha_dia          ON franjas_horarias (id_cancha, dia_semana);
CREATE INDEX idx_canchas_disciplina_estado   ON canchas (id_disciplina, estado);

-- Vista de conveniencia: reintroduce cancha/disciplina para consultas de
-- disponibilidad, sin desnormalizar la tabla reservas.
CREATE VIEW v_reservas_detalle AS
SELECT
    r.id_reserva,
    r.fecha,
    c.id_cancha,
    c.nombre        AS cancha_nombre,
    c.id_disciplina,
    f.dia_semana,
    f.hora_inicio,
    f.hora_fin,
    r.id_usuario,
    r.id_no_socio,
    r.estado,
    r.origen,
    r.monto_total
FROM reservas r
JOIN franjas_horarias f ON f.id_franja = r.id_franja
JOIN canchas c          ON c.id_cancha = f.id_cancha;

-- RF16: máximo 2 reservas CONFIRMADA simultáneas por socio, con lock
-- transaccional para evitar condición de carrera entre inserts
-- concurrentes del mismo socio (RNF03).
CREATE OR REPLACE FUNCTION fn_check_max_reservas_activas()
RETURNS TRIGGER AS $$
DECLARE
    v_cantidad INT;
BEGIN
    IF NEW.estado = 'CONFIRMADA' AND NEW.id_usuario IS NOT NULL THEN
        PERFORM pg_advisory_xact_lock(hashtext(NEW.id_usuario::text));

        SELECT count(*) INTO v_cantidad
        FROM reservas
        WHERE id_usuario = NEW.id_usuario
          AND estado = 'CONFIRMADA'
          AND id_reserva <> COALESCE(NEW.id_reserva, '00000000-0000-0000-0000-000000000000'::uuid);

        IF v_cantidad >= 2 THEN
            RAISE EXCEPTION 'El socio ya tiene el máximo de 2 reservas CONFIRMADA permitidas (RF16)';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_max_reservas_activas
    BEFORE INSERT OR UPDATE ON reservas
    FOR EACH ROW EXECUTE FUNCTION fn_check_max_reservas_activas();

-- RF14/RNF05: deja un rastro append-only de cada alta/cambio de estado
-- de reserva, sin depender de que el backend lo registre siempre.
CREATE OR REPLACE FUNCTION fn_auditoria_reserva()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO registros_auditoria (actor_tipo, id_usuario, evento, entidad, id_entidad, detalle)
        VALUES ('SISTEMA', NEW.id_usuario, 'RESERVA_CREADA', 'reservas', NEW.id_reserva,
                jsonb_build_object('estado', NEW.estado, 'origen', NEW.origen));
    ELSIF TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO registros_auditoria (actor_tipo, id_usuario, evento, entidad, id_entidad, detalle)
        VALUES ('SISTEMA', NEW.id_usuario, 'RESERVA_CAMBIO_ESTADO', 'reservas', NEW.id_reserva,
                jsonb_build_object('estado_anterior', OLD.estado, 'estado_nuevo', NEW.estado));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditoria_reserva
    AFTER INSERT OR UPDATE ON reservas
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria_reserva();

-- =====================================================================
-- 9. DETALLE ALQUILER EQUIPAMIENTO
-- =====================================================================
CREATE TABLE detalle_alquiler_equipamiento (
    id_detalle                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_reserva                UUID NOT NULL REFERENCES reservas(id_reserva) ON DELETE CASCADE,
    id_equipamiento           UUID NOT NULL REFERENCES equipamientos(id_equipamiento),
    cantidad                  INT NOT NULL CHECK (cantidad > 0), -- RF12.1
    precio_unitario           NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal                  NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    fecha_devolucion_estimada TIMESTAMPTZ, -- se completa por trigger, RF13.1
    fecha_devolucion_real     TIMESTAMPTZ,
    estado_devolucion         TEXT NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado_devolucion IN ('PENDIENTE', 'DEVUELTO', 'DEVUELTO_TARDE', 'NO_DEVUELTO')),
    creado_en                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_reserva, id_equipamiento)
);
COMMENT ON TABLE detalle_alquiler_equipamiento IS 'Equipamiento alquilado en cada reserva (RF03.2, RF12, RF13).';

CREATE INDEX idx_detalle_reserva ON detalle_alquiler_equipamiento (id_reserva);

-- RF12.2 + RF21.3 + RF12.3: valida en un solo trigger, con lock de fila
-- sobre el equipamiento (SELECT ... FOR UPDATE) para descuento atómico
-- de stock (RNF03), que:
--   a) el equipamiento pertenezca a la disciplina de la cancha reservada;
--   b) la reserva sea de un Socio (los no socios no alquilan equipamiento);
--   c) haya stock disponible suficiente, y lo descuenta de inmediato.
CREATE OR REPLACE FUNCTION fn_validar_alquiler_equipamiento()
RETURNS TRIGGER AS $$
DECLARE
    v_id_usuario        UUID;
    v_id_no_socio       UUID;
    v_disciplina_cancha UUID;
    v_disciplina_equipo UUID;
    v_stock_disponible  INT;
BEGIN
    SELECT r.id_usuario, r.id_no_socio, c.id_disciplina
      INTO v_id_usuario, v_id_no_socio, v_disciplina_cancha
    FROM reservas r
    JOIN franjas_horarias f ON f.id_franja = r.id_franja
    JOIN canchas c          ON c.id_cancha = f.id_cancha
    WHERE r.id_reserva = NEW.id_reserva;

    IF v_id_no_socio IS NOT NULL THEN
        RAISE EXCEPTION 'Un no socio no puede alquilar equipamiento (RF21.3)';
    END IF;

    SELECT id_disciplina, stock_disponible
      INTO v_disciplina_equipo, v_stock_disponible
    FROM equipamientos
    WHERE id_equipamiento = NEW.id_equipamiento
    FOR UPDATE;

    IF v_disciplina_equipo <> v_disciplina_cancha THEN
        RAISE EXCEPTION 'El equipamiento debe pertenecer a la disciplina de la cancha reservada (RF12.2)';
    END IF;

    IF v_stock_disponible < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el equipamiento solicitado (RF12.3)';
    END IF;

    UPDATE equipamientos
       SET stock_disponible = stock_disponible - NEW.cantidad
     WHERE id_equipamiento = NEW.id_equipamiento;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_alquiler_equipamiento
    BEFORE INSERT ON detalle_alquiler_equipamiento
    FOR EACH ROW EXECUTE FUNCTION fn_validar_alquiler_equipamiento();

-- RF13.1: calcula fecha_devolucion_estimada = fin de franja + 15 min,
-- en vez de dejarlo librado a que el backend lo calcule bien siempre.
-- Ajustar el nombre de zona horaria al del club si difiere.
CREATE OR REPLACE FUNCTION fn_set_fecha_devolucion_estimada()
RETURNS TRIGGER AS $$
DECLARE
    v_hora_fin TIME;
    v_fecha    DATE;
BEGIN
    IF NEW.fecha_devolucion_estimada IS NULL THEN
        SELECT f.hora_fin, r.fecha INTO v_hora_fin, v_fecha
        FROM reservas r
        JOIN franjas_horarias f ON f.id_franja = r.id_franja
        WHERE r.id_reserva = NEW.id_reserva;

        NEW.fecha_devolucion_estimada :=
            (v_fecha + v_hora_fin) AT TIME ZONE 'America/Argentina/Cordoba' + INTERVAL '15 minutes';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_fecha_devolucion_estimada
    BEFORE INSERT ON detalle_alquiler_equipamiento
    FOR EACH ROW EXECUTE FUNCTION fn_set_fecha_devolucion_estimada();

-- RF13.2/RF13.3/RF13.4: al registrar la devolución, repone stock salvo
-- NO_DEVUELTO ("no repone stock automáticamente"), y lleva el contador
-- de incumplimientos hasta suspender la cuenta al tercero (RF13.4).
CREATE OR REPLACE FUNCTION fn_gestionar_devolucion_equipamiento()
RETURNS TRIGGER AS $$
DECLARE
    v_id_usuario      UUID;
    v_incumplimientos INT;
BEGIN
    IF OLD.estado_devolucion IS DISTINCT FROM NEW.estado_devolucion THEN

        IF NEW.estado_devolucion IN ('DEVUELTO', 'DEVUELTO_TARDE') THEN
            UPDATE equipamientos
               SET stock_disponible = stock_disponible + NEW.cantidad
             WHERE id_equipamiento = NEW.id_equipamiento;
        END IF;

        IF NEW.estado_devolucion IN ('DEVUELTO_TARDE', 'NO_DEVUELTO') THEN
            SELECT r.id_usuario INTO v_id_usuario
            FROM reservas r WHERE r.id_reserva = NEW.id_reserva;

            IF v_id_usuario IS NOT NULL THEN
                UPDATE usuarios
                   SET incumplimientos_equipamiento = incumplimientos_equipamiento + 1,
                       actualizado_en = now()
                 WHERE id_usuario = v_id_usuario
                 RETURNING incumplimientos_equipamiento INTO v_incumplimientos;

                INSERT INTO registros_auditoria (actor_tipo, id_usuario, evento, entidad, id_entidad, detalle)
                VALUES ('SISTEMA', v_id_usuario, 'INCUMPLIMIENTO_EQUIPAMIENTO', 'detalle_alquiler_equipamiento', NEW.id_detalle,
                        jsonb_build_object('estado_devolucion', NEW.estado_devolucion, 'total_incumplimientos', v_incumplimientos));

                IF v_incumplimientos >= 3 THEN
                    UPDATE usuarios SET estado = 'SUSPENDIDO', actualizado_en = now()
                     WHERE id_usuario = v_id_usuario AND estado <> 'SUSPENDIDO';

                    INSERT INTO registros_auditoria (actor_tipo, id_usuario, evento, entidad, id_entidad, detalle)
                    VALUES ('SISTEMA', v_id_usuario, 'USUARIO_SUSPENDIDO_POR_INCUMPLIMIENTOS', 'usuarios', v_id_usuario,
                            jsonb_build_object('incumplimientos', v_incumplimientos));
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gestionar_devolucion_equipamiento
    AFTER UPDATE ON detalle_alquiler_equipamiento
    FOR EACH ROW EXECUTE FUNCTION fn_gestionar_devolucion_equipamiento();

-- RF13.3: marca NO_DEVUELTO tras 24hs sin devolución post-franja. No hay
-- evento de BD que dispare esto por el mero paso del tiempo: debe
-- programarse como job periódico (pg_cron / Supabase scheduled function),
-- p.ej. `select cron.schedule('marcar-no-devueltos', '*/15 * * * *',
-- 'select fn_marcar_no_devueltos()');`.
CREATE OR REPLACE FUNCTION fn_marcar_no_devueltos()
RETURNS void AS $$
BEGIN
    UPDATE detalle_alquiler_equipamiento
       SET estado_devolucion = 'NO_DEVUELTO'
     WHERE estado_devolucion = 'PENDIENTE'
       AND fecha_devolucion_estimada IS NOT NULL
       AND fecha_devolucion_estimada + INTERVAL '24 hours' < now();
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 10. REGISTROS DE AUDITORÍA
--     Contempla actor humano (USUARIO) o del sistema (SISTEMA/triggers).
-- =====================================================================
CREATE TABLE registros_auditoria (
    id_registro UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_tipo  TEXT NOT NULL DEFAULT 'USUARIO'
        CHECK (actor_tipo IN ('USUARIO', 'SISTEMA')),
    id_usuario  UUID REFERENCES usuarios(id_usuario), -- NULL si actor_tipo = SISTEMA sin usuario asociado
    evento      TEXT NOT NULL,   -- ej: 'RESERVA_CREADA', 'EQUIPAMIENTO_NO_DEVUELTO'
    entidad     TEXT NOT NULL,   -- tabla/entidad afectada
    id_entidad  UUID,
    detalle     JSONB,
    fecha       TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE registros_auditoria IS 'Eventos de auditoría con actor y fecha (RF14, RNF05). Solo-append.';

CREATE INDEX idx_auditoria_actor ON registros_auditoria (id_usuario);
CREATE INDEX idx_auditoria_fecha ON registros_auditoria (fecha);

-- RNF05: solo-append a nivel de permisos, no solo de convención.
-- Ajustar el nombre de rol al que use realmente el backend/Supabase.
REVOKE UPDATE, DELETE ON registros_auditoria FROM PUBLIC;

-- =====================================================================
-- 11. RF15: cancha a MANTENIMIENTO -> cancela reservas CONFIRMADA
--     futuras y libera el stock de equipamiento aún no retirado.
-- =====================================================================
CREATE OR REPLACE FUNCTION fn_cancha_a_mantenimiento()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'MANTENIMIENTO' AND OLD.estado IS DISTINCT FROM NEW.estado THEN

        -- Libera el stock de equipamiento pendiente de retiro asociado a
        -- las reservas que se van a cancelar.
        UPDATE equipamientos e
           SET stock_disponible = e.stock_disponible + d.cantidad
        FROM detalle_alquiler_equipamiento d
        JOIN reservas r         ON r.id_reserva = d.id_reserva
        JOIN franjas_horarias f ON f.id_franja = r.id_franja
        WHERE f.id_cancha = NEW.id_cancha
          AND r.estado = 'CONFIRMADA'
          AND r.fecha >= CURRENT_DATE
          AND d.estado_devolucion = 'PENDIENTE'
          AND e.id_equipamiento = d.id_equipamiento;

        UPDATE reservas r
           SET estado = 'CANCELADA', cancelado_en = now(), actualizado_en = now()
        FROM franjas_horarias f
        WHERE f.id_franja = r.id_franja
          AND f.id_cancha = NEW.id_cancha
          AND r.estado = 'CONFIRMADA'
          AND r.fecha >= CURRENT_DATE;

        INSERT INTO registros_auditoria (actor_tipo, evento, entidad, id_entidad, detalle)
        VALUES ('SISTEMA', 'CANCHA_A_MANTENIMIENTO', 'canchas', NEW.id_cancha,
                jsonb_build_object('reservas_canceladas_desde', CURRENT_DATE));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cancha_a_mantenimiento
    AFTER UPDATE ON canchas
    FOR EACH ROW EXECUTE FUNCTION fn_cancha_a_mantenimiento();

-- =====================================================================
-- 12. ROW LEVEL SECURITY — postura "deny-all" desde el día uno.
--     Sin políticas todavía => acceso denegado a cualquier rol que no
--     sea service_role. El backend (NestJS) usa la service_role key de
--     Supabase, que ignora RLS. Las políticas por rol (SOCIO/GERENTE/
--     ADMINISTRADOR) se agregan en la fase de Backend (RF06.3).
-- =====================================================================
ALTER TABLE disciplinas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_permiso           ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_socios                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE canchas                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE franjas_horarias              ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamientos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_alquiler_equipamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_auditoria           ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 13. DATOS INICIALES DE REFERENCIA
-- =====================================================================
INSERT INTO disciplinas (nombre, descripcion)
VALUES
    ('Fútbol', 'Canchas de fútbol 5/7/11'),
    ('Tenis',  'Canchas de tenis'),
    ('Pádel',  'Canchas de pádel')
ON CONFLICT (nombre) DO NOTHING;
