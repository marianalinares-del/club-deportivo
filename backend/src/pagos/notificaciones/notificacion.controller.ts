import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificacionService } from './notificacion.service';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';

@Controller('api/v1')
export class NotificacionController {
  constructor(private readonly notificacionService: NotificacionService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERENTE', 'ADMINISTRADOR')
  @Post('notifications')
  async enviarNotificacion(
    @Body()
    body: {
      id_usuario: string;
      tipo: string;
      mensaje: string;
      id_reserva?: string;
    },
  ) {
    return this.notificacionService.enviarNotificacion(body);
  }
}
