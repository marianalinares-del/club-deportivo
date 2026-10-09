import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IUsuarioRepository } from '../../common/repositories/interfaces';
import { ResolverSolicitudDto } from '../dto/usuarios.dto';

@Injectable()
export class PermisoService {
  constructor(@Inject('IUsuarioRepository') private usuarioRepo: IUsuarioRepository) {}

  async listarSolicitudes(estado?: string) {
    return this.usuarioRepo.findManySolicitudes({ estado });
  }

  async resolverSolicitud(id_solicitud: string, dto: ResolverSolicitudDto, id_gestor: string) {
    const solicitud = await this.usuarioRepo.findSolicitudById(id_solicitud);
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException('La solicitud ya fue resuelta');
    }

    return this.usuarioRepo.updateSolicitudPermiso(id_solicitud, {
      estado: dto.estado,
      id_gestor_aprobador: id_gestor,
      fecha_resolucion: new Date(),
      ...(dto.estado === 'APROBADA' && { id_usuario_generado: solicitud.id_persona }),
    });
  }

  async listarUsuarios(rol?: string, estado?: string) {
    return this.usuarioRepo.findManyUsuarios({ rol, estado });
  }

  async cambiarEstadoUsuario(id_usuario: string, estado: string) {
    const usuario = await this.usuarioRepo.findUsuarioById(id_usuario);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.usuarioRepo.updateUsuarioEstado(id_usuario, estado);
  }
}