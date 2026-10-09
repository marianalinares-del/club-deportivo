export interface IPagoRepository {
  createPagoRegistro(data: {
    actor_tipo: string;
    id_usuario: string;
    evento: string;
    entidad: string;
    id_entidad: string;
    detalle: any;
  }): Promise<any>;
  findPagosByReserva(idReserva: string): Promise<any[]>;
  findAllPagos(filtros: { fechaDesde?: Date; fechaHasta?: Date }): Promise<any[]>;
  findAuditoria(filtros: {
    idUsuario?: string;
    entidad?: string;
    evento?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }): Promise<any[]>;
  getReporteAuditoria(fechaDesde: Date, fechaHasta: Date): Promise<{
    totalEventos: number;
    porEvento: any[];
    porEntidad: any[];
    topUsuarios: any[];
  }>;
}