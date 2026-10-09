import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaQueryDto } from '../dto/pagos.dto';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';

@Controller('api/v1')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Get('audit-logs')
  async getAuditoria(@Query() filtros: AuditoriaQueryDto) {
    return this.auditoriaService.getAuditoria(filtros);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Get('audit-logs/report')
  async getReporteAuditoria(
    @Query('date_from') fecha_desde: string,
    @Query('date_to') fecha_hasta: string,
  ) {
    return this.auditoriaService.getReporteAuditoria(fecha_desde, fecha_hasta);
  }
}
