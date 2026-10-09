import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AlquilerEquipamientoService } from './alquiler-equipamiento.service';
import { CreateAlquilerEquipamientoDto, UpdateDevolucionDto } from '../dto/reservas.dto';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ActiveUserGuard } from '../../auth/active-user.guard';

@Controller('api/v1')
export class AlquilerEquipamientoController {
  constructor(private readonly alquilerService: AlquilerEquipamientoService) {}

  @Get('equipment')
  async listarEquipamientos(@Query('discipline_id') disciplineId?: string) {
    return this.alquilerService.listarEquipamientos(disciplineId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('equipment-rentals')
  async listarAlquileres(@Query('reservation_id') reservationId?: string) {
    return this.alquilerService.listarAlquileres(reservationId);
  }

  @UseGuards(AuthGuard('jwt'), ActiveUserGuard)
  @Post('equipment-rentals')
  async crearAlquiler(@Body() dto: CreateAlquilerEquipamientoDto) {
    return this.alquilerService.crearAlquiler(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERENTE', 'ADMINISTRADOR')
  @Patch('equipment-rentals/:id/return')
  async procesarDevolucion(
    @Param('id') id: string,
    @Body() dto: UpdateDevolucionDto,
  ) {
    return this.alquilerService.procesarDevolucion(id, dto);
  }
}