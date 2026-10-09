import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IUsuarioRepository } from '../../common/repositories/interfaces';
import { UpdatePerfilDto } from '../dto/usuarios.dto';

@Injectable()
export class UsuarioProfileService {
  constructor(@Inject('IUsuarioRepository') private usuarioRepo: IUsuarioRepository) {}

  async getPerfil(id_usuario: string) {
    const usuario = await this.usuarioRepo.findPersonaById(id_usuario);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const usuarioData = await this.usuarioRepo.findUsuarioById(id_usuario);

    return {
      id_usuario: usuarioData?.id_usuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      dni: usuario.dni,
      cuil: usuario.cuil,
      fecha_nacimiento: usuario.fecha_nacimiento,
      rol: usuarioData?.rol,
      estado: usuarioData?.estado,
      contactos: usuario.contactos.map((c) => ({
        tipo: c.tipo_contacto,
        valor: c.valor_contacto,
      })),
      direcciones: usuario.direcciones.map((d) => ({
        tipo: d.tipo_direccion,
        calle: d.calle,
        numero: d.numero,
        localidad: d.localidad,
        provincia: d.provincia,
      })),
    };
  }

  async updatePerfil(id_usuario: string, dto: UpdatePerfilDto) {
    const usuario = await this.usuarioRepo.findUsuarioById(id_usuario);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.usuarioRepo.transaction(async (tx) => {
      if (dto.nombre || dto.apellido) {
        await tx.updatePersona(id_usuario, {
          ...(dto.nombre && { nombre: dto.nombre }),
          ...(dto.apellido && { apellido: dto.apellido }),
        });
      }

      if (dto.email) {
        await tx.updateContactoEstado(
          usuario.id_contacto_login!,
          'INACTIVO',
          new Date()
        );
        await tx.createContacto({
          id_persona: id_usuario,
          tipo_contacto: 'EMAIL',
          valor_contacto: dto.email.toLowerCase().trim(),
          estado: 'ACTIVO',
        });
      }

      if (dto.telefono) {
        const telefonoExistente = await tx.findContactoByPersonaAndTipo(id_usuario, 'TELEFONO');
        if (telefonoExistente) {
          await tx.updateContactoEstado(telefonoExistente.id_contacto, 'INACTIVO', new Date());
        }
        await tx.createContacto({
          id_persona: id_usuario,
          tipo_contacto: 'TELEFONO',
          valor_contacto: dto.telefono,
          estado: 'ACTIVO',
        });
      }
    });

    return this.getPerfil(id_usuario);
  }
}