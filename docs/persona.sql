-- ============================================================
-- EXTENSIONES
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- para que funcione uuid con random hexadecimal

-- TABLA PRINCIPAL: persona
CREATE TABLE persona (
    id_persona UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    fecha_nacimiento DATE,
    dni TEXT NOT NULL UNIQUE,
    cuil TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLA: CONTACTO_PERSONA
-- Una persona puede tener múltiples contactos:
-- No existe límite de cantidad de contactos.
CREATE TABLE contacto_persona (
    id_contacto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_persona UUID NOT NULL,
    tipo_contacto TEXT NOT NULL
        CHECK (
            tipo_contacto IN (
                'email',
                'telefono'
            )
        ),
    valor_contacto TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'activo'
        CHECK (
            estado IN (
                'activo',
                'inactivo'
            )
        ),
    inactivated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_contacto_persona
        FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE CASCADE,
    CONSTRAINT chk_contacto_inactivated_at
        CHECK (
            (estado = 'activo' AND inactivated_at IS NULL)
            OR
            (estado = 'inactivo' AND inactivated_at IS NOT NULL)
        )
);

-- TABLA: DIRECCION_PERSONA
-- Una persona puede tener múltiples direcciones.
CREATE TABLE direccion_persona (
    id_direccion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_persona UUID NOT NULL,
    tipo_direccion TEXT NOT NULL
        CHECK (
            tipo_direccion IN (
                'personal',
                'laboral'
            )
        ),
    calle TEXT,
    numero TEXT,
    piso TEXT,
    departamento TEXT,
    codigo_postal TEXT,
    localidad TEXT,
    provincia TEXT,
    pais TEXT NOT NULL DEFAULT 'Argentina',
    estado TEXT NOT NULL DEFAULT 'activo'
        CHECK (
            estado IN (
                'activo',
                'inactivo'
            )
        ),
    inactivated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_direccion_persona
        FOREIGN KEY (id_persona)
        REFERENCES persona(id_persona)
        ON DELETE CASCADE,
    CONSTRAINT chk_direccion_inactivated_at
        CHECK (
            (estado = 'activo' AND inactivated_at IS NULL)
            OR
            (estado = 'inactivo' AND inactivated_at IS NOT NULL)
        )
);

-- ÍNDICES
-- Búsquedas y ordenamiento por apellido y nombre.
CREATE INDEX idx_persona_apellido_nombre
    ON persona (apellido, nombre);
-- Contactos activos de una persona.
CREATE INDEX idx_contacto_persona_activo
    ON contacto_persona (id_persona)
    WHERE estado = 'activo';
-- Direcciones activas de una persona.
CREATE INDEX idx_direccion_persona_activo
    ON direccion_persona (id_persona)
    WHERE estado = 'activo';

-- FUNCIÓN: ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS: updated_at
CREATE TRIGGER trg_persona_updated_at
BEFORE UPDATE ON persona
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_contacto_updated_at
BEFORE UPDATE ON contacto_persona
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_direccion_updated_at
BEFORE UPDATE ON direccion_persona
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- FUNCIÓN: CONTROLAR inactivated_at
CREATE OR REPLACE FUNCTION set_inactivated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- ACTIVO → INACTIVO
    IF OLD.estado = 'activo'
       AND NEW.estado = 'inactivo' THEN
        NEW.inactivated_at = NOW();
    -- INACTIVO → ACTIVO
    ELSIF OLD.estado = 'inactivo'
       AND NEW.estado = 'activo' THEN
        NEW.inactivated_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS: inactivated_at
CREATE TRIGGER trg_contacto_inactivated_at
BEFORE UPDATE ON contacto_persona
FOR EACH ROW
EXECUTE FUNCTION set_inactivated_at();

CREATE TRIGGER trg_direccion_inactivated_at
BEFORE UPDATE ON direccion_persona
FOR EACH ROW
EXECUTE FUNCTION set_inactivated_at();

-- DOCUMENTACIÓN
COMMENT ON TABLE persona IS
    'Personas físicas registradas en el sistema.';

COMMENT ON TABLE contacto_persona IS
    'Contactos asociados a una persona. Una persona puede tener múltiples contactos.';

COMMENT ON TABLE direccion_persona IS
    'Direcciones asociadas a una persona. Una persona puede tener múltiples direcciones.';

COMMENT ON COLUMN persona.dni IS
    'Documento Nacional de Identidad. Único y obligatorio.';

COMMENT ON COLUMN persona.cuil IS
    'Código Único de Identificación Laboral. Único cuando está informado.';

COMMENT ON COLUMN contacto_persona.tipo_contacto IS
    'Tipo de contacto: email o telefono.';

COMMENT ON COLUMN contacto_persona.estado IS
    'Estado actual del contacto: activo o inactivo.';

COMMENT ON COLUMN contacto_persona.inactivated_at IS
    'Fecha y hora en que el contacto fue desactivado.';

COMMENT ON COLUMN direccion_persona.tipo_direccion IS
    'Tipo de dirección: personal o laboral.';

COMMENT ON COLUMN direccion_persona.estado IS
    'Estado actual de la dirección: activo o inactivo.';

COMMENT ON COLUMN direccion_persona.inactivated_at IS
    'Fecha y hora en que la dirección fue desactivada.';

-- ============================================================