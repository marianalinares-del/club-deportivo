export interface IAuditoriaRepository {
  createRegistro(data: {
    actor_tipo: string;
    id_usuario?: string;
    evento: string;
    entidad: string;
    id_entidad?: string | null;
    detalle?: any;
  }): Promise<any>;
  findMany(filtros: {
    id_usuario?: string;
    entidad?: string;
    evento?: string;
    fecha_desde?: Date;
    fecha_hasta?: Date;
  }): Promise<any[]>;
  groupByEvento(fechaDesde: Date, fechaHasta: Date): Promise<any[]>;
  groupByEntidad(fechaDesde: Date, fechaHasta: Date): Promise<any[]>;
  groupByUsuario(fechaDesde: Date, fechaHasta: Date): Promise<any[]>;
  count(fechaDesde: Date, fechaHasta: Date): Promise<number>;
}