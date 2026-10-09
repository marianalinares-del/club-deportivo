import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PagoController } from './pagos/pago.controller';
import { AuditoriaController } from './auditoria/auditoria.controller';
import { NotificacionController } from './notificaciones/notificacion.controller';
import { PagoService } from './pagos/pago.service';
import { AuditoriaService } from './auditoria/auditoria.service';
import { NotificacionService } from './notificaciones/notificacion.service';

@Module({
  imports: [CommonModule],
  controllers: [PagoController, AuditoriaController, NotificacionController],
  providers: [PagoService, AuditoriaService, NotificacionService],
  exports: [PagoService, AuditoriaService, NotificacionService],
})
export class PagosModule {}
