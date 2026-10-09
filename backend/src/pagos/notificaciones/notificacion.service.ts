import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IUsuarioRepository, IAuditoriaRepository } from '../../common/repositories/interfaces';

@Injectable()
export class NotificacionService {
  constructor(
    @Inject('IUsuarioRepository') private usuarioRepo: IUsuarioRepository,
    @Inject('IAuditoriaRepository') private auditoriaRepo: IAuditoriaRepository,
  ) {}

  /**
   * Enviar notificación (simulada - registra en auditoría).
   * En producción, aquí se integraría con un servicio de email (SendGrid, etc.)
   */
  async enviarNotificacion(params: {
    id_usuario: string;
    tipo: string;
    mensaje: string;
    id_reserva?: string;
  }) {
    const usuario = await this.usuarioRepo.findUsuarioById(params.id_usuario);

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const contacto = await this.usuarioRepo.findContactoByPersonaAndTipo(params.id_usuario, 'EMAIL');
    const email = contacto?.valor_contacto || 'sin-email';

    // Registrar la notificación en auditoría
    await this.auditoriaRepo.createRegistro({
      actor_tipo: 'SISTEMA',
      id_usuario: params.id_usuario,
      evento: `NOTIFICACION_${params.tipo.toUpperCase()}`,
      entidad: 'notificaciones',
      id_entidad: params.id_reserva || null,
      detalle: {
        email,
        mensaje: params.mensaje,
        enviado_en: new Date().toISOString(),
      },
    });

    return {
      message: 'Notificación enviada (simulada)',
      email,
      tipo: params.tipo,
    };
  }
}
