import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IUsuarioRepository, PersonaWithRelations } from '../interfaces';
import { Usuario, Persona, ContactoPersona, DireccionPersona, SolicitudPermiso } from '@prisma/client';

@Injectable()
export class UsuarioRepository implements IUsuarioRepository {
  constructor(private prisma: PrismaService) {}

  async findUsuarioById(id: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({ where: { id_usuario: id } });
  }

  async findUsuarioByEmail(email: string): Promise<Usuario | null> {
    const contacto = await this.prisma.contactoPersona.findFirst({
      where: {
        tipo_contacto: 'EMAIL',
        valor_contacto: email.toLowerCase().trim(),
        estado: 'ACTIVO',
      },
      include: { persona: { include: { usuario: true } } },
    });
    return contacto?.persona?.usuario ?? null;
  }

  async findUsuarioByDni(dni: string): Promise<Usuario | null> {
    const persona = await this.prisma.persona.findUnique({
      where: { dni },
      include: { usuario: true },
    });
    return persona?.usuario ?? null;
  }

  async createUsuario(data: {
    id_usuario: string;
    id_contacto_login: string;
    rol?: string;
    estado?: string;
    password_hash?: string;
  }): Promise<Usuario> {
    return this.prisma.usuario.create({ data });
  }

  async updateUsuario(id: string, data: Partial<Usuario>): Promise<Usuario> {
    return this.prisma.usuario.update({ where: { id_usuario: id }, data });
  }

  async updateUsuarioEstado(id: string, estado: string): Promise<Usuario> {
    return this.prisma.usuario.update({ where: { id_usuario: id }, data: { estado } });
  }

  async findManyUsuarios(filtros: { rol?: string; estado?: string }): Promise<Usuario[]> {
    const where: any = {};
    if (filtros.rol) where.rol = filtros.rol;
    if (filtros.estado) where.estado = filtros.estado;
    return this.prisma.usuario.findMany({
      where,
      include: {
        persona: {
          include: {
            contactos: { where: { estado: 'ACTIVO' } },
          },
        },
      },
      orderBy: { creado_en: 'desc' },
    });
  }

  async findPersonaById(id: string): Promise<PersonaWithRelations | null> {
    const persona = await this.prisma.persona.findUnique({
      where: { id_persona: id },
      include: {
        contactos: { where: { estado: 'ACTIVO' } },
        direcciones: { where: { estado: 'ACTIVO' } },
      },
    });
    if (!persona) return null;
    return persona as PersonaWithRelations;
  }

  async findPersonaByDni(dni: string): Promise<Persona | null> {
    return this.prisma.persona.findUnique({ where: { dni } });
  }

  async findPersonaByCuil(cuil: string): Promise<Persona | null> {
    return this.prisma.persona.findUnique({ where: { cuil } });
  }

  async createPersona(data: {
    dni: string;
    cuil?: string;
    nombre: string;
    apellido: string;
    fecha_nacimiento?: Date | null;
  }): Promise<Persona> {
    return this.prisma.persona.create({ data });
  }

  async updatePersona(id: string, data: Partial<Persona>): Promise<Persona> {
    return this.prisma.persona.update({ where: { id_persona: id }, data });
  }

  async findContactoByEmail(email: string): Promise<ContactoPersona | null> {
    return this.prisma.contactoPersona.findFirst({
      where: {
        tipo_contacto: 'EMAIL',
        valor_contacto: email.toLowerCase().trim(),
        estado: 'ACTIVO',
      },
    });
  }

  async findContactoByPersonaAndTipo(idPersona: string, tipo: string): Promise<ContactoPersona | null> {
    return this.prisma.contactoPersona.findFirst({
      where: {
        id_persona: idPersona,
        tipo_contacto: tipo,
        estado: 'ACTIVO',
      },
    });
  }

  async createContacto(data: {
    id_persona: string;
    tipo_contacto: string;
    valor_contacto: string;
    estado?: string;
  }): Promise<ContactoPersona> {
    return this.prisma.contactoPersona.create({ data });
  }

  async updateContactoEstado(id: string, estado: string, inactivatedAt?: Date): Promise<ContactoPersona> {
    return this.prisma.contactoPersona.update({
      where: { id_contacto: id },
      data: { estado, inactivated_at: inactivatedAt ?? null },
    });
  }

  async createContactoIfNotExists(data: {
    id_persona: string;
    tipo_contacto: string;
    valor_contacto: string;
  }): Promise<ContactoPersona> {
    const existing = await this.prisma.contactoPersona.findFirst({
      where: {
        id_persona: data.id_persona,
        tipo_contacto: data.tipo_contacto,
        valor_contacto: data.valor_contacto,
        estado: 'ACTIVO',
      },
    });
    if (existing) return existing;
    return this.prisma.contactoPersona.create({ data: { ...data, estado: 'ACTIVO' } });
  }

  async createSolicitudPermiso(data: {
    id_persona: string;
    origen: string;
    estado?: string;
  }): Promise<SolicitudPermiso> {
    return this.prisma.solicitudPermiso.create({ data });
  }

  async findSolicitudById(id: string): Promise<SolicitudPermiso | null> {
    return this.prisma.solicitudPermiso.findUnique({
      where: { id_solicitud: id },
      include: {
        persona: {
          include: {
            contactos: { where: { tipo_contacto: 'EMAIL', estado: 'ACTIVO' }, take: 1 },
          },
        },
        gestorAprobador: { include: { persona: true } },
      },
    });
  }

  async findManySolicitudes(filtros: { estado?: string }): Promise<SolicitudPermiso[]> {
    const where: any = {};
    if (filtros.estado) where.estado = filtros.estado;
    return this.prisma.solicitudPermiso.findMany({
      where,
      include: {
        persona: {
          include: {
            contactos: { where: { tipo_contacto: 'EMAIL', estado: 'ACTIVO' }, take: 1 },
          },
        },
        gestorAprobador: { include: { persona: true } },
      },
      orderBy: { fecha_solicitud: 'desc' },
    });
  }

  async updateSolicitudPermiso(id: string, data: {
    estado: string;
    id_gestor_aprobador?: string;
    fecha_resolucion?: Date;
    id_usuario_generado?: string;
  }): Promise<SolicitudPermiso> {
    return this.prisma.solicitudPermiso.update({ where: { id_solicitud: id }, data });
  }

  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}