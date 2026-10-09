import { Usuario, Persona, ContactoPersona, DireccionPersona, SolicitudPermiso } from '@prisma/client';

export interface PersonaWithRelations extends Persona {
  contactos: ContactoPersona[];
  direcciones: DireccionPersona[];
}

export interface IUsuarioRepository {
  // Usuario
  findUsuarioById(id: string): Promise<Usuario | null>;
  findUsuarioByEmail(email: string): Promise<Usuario | null>;
  findUsuarioByDni(dni: string): Promise<Usuario | null>;
  createUsuario(data: {
    id_usuario: string;
    id_contacto_login: string;
    rol?: string;
    estado?: string;
    password_hash?: string;
  }): Promise<Usuario>;
  updateUsuario(id: string, data: Partial<Usuario>): Promise<Usuario>;
  updateUsuarioEstado(id: string, estado: string): Promise<Usuario>;
  findManyUsuarios(filtros: { rol?: string; estado?: string }): Promise<Usuario[]>;

  // Persona
  findPersonaById(id: string): Promise<PersonaWithRelations | null>;
  findPersonaByDni(dni: string): Promise<Persona | null>;
  findPersonaByCuil(cuil: string): Promise<Persona | null>;
  createPersona(data: {
    dni: string;
    cuil?: string;
    nombre: string;
    apellido: string;
    fecha_nacimiento?: Date | null;
  }): Promise<Persona>;
  updatePersona(id: string, data: Partial<Persona>): Promise<Persona>;

  // ContactoPersona
  findContactoByEmail(email: string): Promise<ContactoPersona | null>;
  findContactoByPersonaAndTipo(idPersona: string, tipo: string): Promise<ContactoPersona | null>;
  createContacto(data: {
    id_persona: string;
    tipo_contacto: string;
    valor_contacto: string;
    estado?: string;
  }): Promise<ContactoPersona>;
  updateContactoEstado(id: string, estado: string, inactivatedAt?: Date): Promise<ContactoPersona>;
  createContactoIfNotExists(data: {
    id_persona: string;
    tipo_contacto: string;
    valor_contacto: string;
  }): Promise<ContactoPersona>;

  // SolicitudPermiso
  createSolicitudPermiso(data: {
    id_persona: string;
    origen: string;
    estado?: string;
  }): Promise<SolicitudPermiso>;
  findSolicitudById(id: string): Promise<SolicitudPermiso | null>;
  findManySolicitudes(filtros: { estado?: string }): Promise<SolicitudPermiso[]>;
  updateSolicitudPermiso(id: string, data: {
    estado: string;
    id_gestor_aprobador?: string;
    fecha_resolucion?: Date;
    id_usuario_generado?: string;
  }): Promise<SolicitudPermiso>;

  // Transacciones
  transaction<T>(fn: (tx: any) => Promise<T>): Promise<T>;
}