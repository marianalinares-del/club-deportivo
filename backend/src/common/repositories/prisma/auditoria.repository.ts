import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IAuditoriaRepository } from '../interfaces';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditoriaRepository implements IAuditoriaRepository {
  constructor(private prisma: PrismaService) {}

  async createRegistro(data: {
    actor_tipo: string;
    id_usuario?: string;
    evento: string;
    entidad: string;
    id_entidad?: string;
    detalle?: Prisma.InputJsonValue;
  }) {
    return this.prisma.registroAuditoria.create({ data });
  }

  async findMany(filtros: {
    id_usuario?: string;
    entidad?: string;
    evento?: string;
    fecha_desde?: Date;
    fecha_hasta?: Date;
  }) {
    const where: any = {};
    if (filtros.id_usuario) where.id_usuario = filtros.id_usuario;
    if (filtros.entidad) where.entidad = filtros.entidad;
    if (filtros.evento) where.evento = filtros.evento;
    if (filtros.fecha_desde || filtros.fecha_hasta) {
      where.fecha = {};
      if (filtros.fecha_desde) where.fecha.gte = new Date(filtros.fecha_desde);
      if (filtros.fecha_hasta) where.fecha.lte = new Date(filtros.fecha_hasta);
    }
    return this.prisma.registroAuditoria.findMany({
      where,
      include: { usuario: { include: { persona: true } } },
      orderBy: { fecha: 'desc' },
      take: 500,
    });
  }

  async groupByEvento(fechaDesde: Date, fechaHasta: Date) {
    return this.prisma.registroAuditoria.groupBy({
      by: ['evento'],
      where: { fecha: { gte: new Date(fechaDesde), lte: new Date(fechaHasta) } },
      _count: { evento: true },
      orderBy: { _count: { evento: 'desc' } },
    });
  }

  async groupByEntidad(fechaDesde: Date, fechaHasta: Date) {
    return this.prisma.registroAuditoria.groupBy({
      by: ['entidad'],
      where: { fecha: { gte: new Date(fechaDesde), lte: new Date(fechaHasta) } },
      _count: { entidad: true },
      orderBy: { _count: { entidad: 'desc' } },
    });
  }

  async groupByUsuario(fechaDesde: Date, fechaHasta: Date) {
    return this.prisma.registroAuditoria.groupBy({
      by: ['id_usuario'],
      where: { fecha: { gte: new Date(fechaDesde), lte: new Date(fechaHasta) }, id_usuario: { not: null } },
      _count: { id_usuario: true },
      orderBy: { _count: { id_usuario: 'desc' } },
      take: 20,
    });
  }

  async count(fechaDesde: Date, fechaHasta: Date) {
    return this.prisma.registroAuditoria.count({
      where: { fecha: { gte: new Date(fechaDesde), lte: new Date(fechaHasta) } },
    });
  }
}