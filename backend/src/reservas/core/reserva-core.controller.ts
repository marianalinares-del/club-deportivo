import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReservaCoreService } from './reserva-core.service';
import { CreateReservaDto } from '../dto/reservas.dto';
import { ActiveUserGuard } from '../../auth/active-user.guard';

@Controller('api/v1')
export class ReservaCoreController {
  constructor(private readonly reservaCoreService: ReservaCoreService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('reservations')
  async listarReservas(
    @Query('person_id') personId?: string,
    @Query('date') fecha?: string,
    @Query('status') estado?: string,
  ) {
    return this.reservaCoreService.listarReservas({
      id_persona: personId,
      fecha,
      estado,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('reservations/:id')
  async getReserva(@Param('id') id: string) {
    return this.reservaCoreService.getReserva(id);
  }

  @UseGuards(AuthGuard('jwt'), ActiveUserGuard)
  @Post('reservations')
  async crearReserva(@Body() dto: CreateReservaDto, @Request() req) {
    return this.reservaCoreService.crearReserva(dto, req.user?.id_usuario);
  }
}