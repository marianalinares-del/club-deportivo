import {
  Controller,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReservaEstadoService } from './reserva-estado.service';
import { UpdateReservaEstadoDto } from '../dto/reservas.dto';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ActiveUserGuard } from '../../auth/active-user.guard';

@Controller('api/v1')
export class ReservaEstadoController {
  constructor(private readonly reservaEstadoService: ReservaEstadoService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERENTE', 'ADMINISTRADOR')
  @Patch('reservations/:id/status')
  async actualizarEstadoReserva(
    @Param('id') id: string,
    @Body() dto: UpdateReservaEstadoDto,
  ) {
    return this.reservaEstadoService.actualizarEstadoReserva(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), ActiveUserGuard)
  @Delete('reservations/:id')
  async cancelarReservaAutogestionada(@Param('id') id: string, @Request() req) {
    return this.reservaEstadoService.cancelarReservaAutogestionada(id, req.user?.id_usuario);
  }
}