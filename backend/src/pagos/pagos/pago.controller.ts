import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PagoService } from './pago.service';
import { CreatePagoDto } from '../dto/pagos.dto';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';

@Controller('api/v1')
export class PagoController {
  constructor(private readonly pagoService: PagoService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERENTE', 'ADMINISTRADOR')
  @Post('payments')
  async crearPago(@Body() dto: CreatePagoDto) {
    return this.pagoService.crearPago(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('payments')
  async listarPagos(
    @Query('date_from') fecha_desde?: string,
    @Query('date_to') fecha_hasta?: string,
  ) {
    return this.pagoService.listarPagos({ fecha_desde, fecha_hasta });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('payments/reservation/:id')
  async getPagosReserva(@Param('id') id: string) {
    return this.pagoService.getPagosReserva(id);
  }
}
