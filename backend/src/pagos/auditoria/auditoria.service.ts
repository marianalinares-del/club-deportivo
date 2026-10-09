import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IAuditoriaRepository } from '../../common/repositories/interfaces';
import { AuditoriaQueryDto } from '../dto/pagos.dto';

@Injectable()
export class AuditoriaService {
  constructor(
    @Inject('IAuditoriaRepository') private auditoriaRepo: IAuditoriaRepository,
  ) {}

  /**
   * Consultar registros de auditoría con filtros.
   */
  async getAuditoria(filtros: AuditoriaQueryDto) {
    return this.auditoriaRepo.findMany({
      id_usuario: filtros.id_usuario,
      entidad: filtros.entidad,
      evento: filtros.evento,
      fecha_desde: filtros.fecha_desde ? new Date(filtros.fecha_desde) : undefined,
      fecha_hasta: filtros.fecha_hasta ? new Date(filtros.fecha_hasta) : undefined,
    });
  }

  /**
   * Generar reporte resumido de auditoría para un rango de fechas.
   */
  async getReporteAuditoria(fecha_desde: string, fecha_hasta: string) {
    const desde = new Date(fecha_desde);
    const hasta = new Date(fecha_hasta);

    const [totalEventos, porEvento, porEntidad, porUsuario] = await Promise.all([
      this.auditoriaRepo.count(desde, hasta),
      this.auditoriaRepo.groupByEvento(desde, hasta),
      this.auditoriaRepo.groupByEntidad(desde, hasta),
      this.auditoriaRepo.groupByUsuario(desde, hasta),
    ]);

    return {
      periodo: { desde: fecha_desde, hasta: fecha_hasta },
      total_eventos: totalEventos,
      por_evento: porEvento,
      por_entidad: porEntidad,
      top_usuarios: porUsuario,
    };
  }
}
