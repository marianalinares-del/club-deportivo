import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ReservaCoreController } from './core/reserva-core.controller';
import { ReservaEstadoController } from './estado/reserva-estado.controller';
import { AlquilerEquipamientoController } from './alquiler/alquiler-equipamiento.controller';
import { ReservaCoreService } from './core/reserva-core.service';
import { ReservaEstadoService } from './estado/reserva-estado.service';
import { AlquilerEquipamientoService } from './alquiler/alquiler-equipamiento.service';

@Module({
  imports: [CommonModule],
  controllers: [ReservaCoreController, ReservaEstadoController, AlquilerEquipamientoController],
  providers: [ReservaCoreService, ReservaEstadoService, AlquilerEquipamientoService],
  exports: [ReservaCoreService, ReservaEstadoService, AlquilerEquipamientoService],
})
export class ReservasModule {}