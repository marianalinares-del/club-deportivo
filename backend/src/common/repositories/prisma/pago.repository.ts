import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IPagoRepository } from '../interfaces';
import { Prisma } from '@prisma/client';

@Injectable()
export class PagoRepository implements IPagoRepository {
  constructor(private prisma: PrismaService) {}

  async createPagoRegistro(data: {
    actor_tipo: string;
    id_usuario: string;
    evento: string;
    entidad: string;
    id_entidad: string;
    detalle: Prisma.InputJsonValue;
  }) {
    return this.prisma.registroAuditoria.create({ data });
  }

  async findPagosByReserva(idReserva: string) {
    return this.prisma.registroAuditoria.findMany({
      where: {
        entidad: 'reservas',
        id_entidad: idReserva,
        evento: { in: ['PAGO_REGISTRADO', 'PAGO_REEMBOLSADO', 'PAGO_FALLIDO'] },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async findAllPagos(filtros: { fechaDesde?: Date; fechaHasta?: Date }) {
    const where: any = {
      evento: { in: ['PAGO_REGISTRADO', 'PAGO_REEMBOLSADO', 'PAGO_FALLIDO'] },
    };
    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.fecha = {};
      if (filtros.fechaDesde) where.fecha.gte = new Date(filtros.fechaDesde);
      if (filtros.fechaHasta) where.fecha.lte = new Date(filtros.fechaHasta);
    }
    return this.prisma.registroAuditoria.findMany({ where, orderBy: { fecha: 'desc' } });
  }

  async findAuditoria(filtros: {
    idUsuario?: string;
    entidad?: string;
    evento?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }) {
    const where: any = {};
    if (filtros.idUsuario) where.id_usuario = filtros.idUsuario;
    if (filtros.entidad) where.entidad = filtros.entidad;
    if (filtros.evento) where.evento = filtros.evento;
    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.fecha = {};
      if (filtros.fechaDesde) where.fecha.gte = new Date(filtros.fechaDesde);
      if (filtros.fechaHasta) where.fecha.lte = new Date(filtros.fechaHasta);
    }
    return this.prisma.registroAuditoria.findMany({
      where,
      include: { usuario: { include: { persona: true } } },
      orderBy: { fecha: 'desc' },
      take: 500,
    });
  }

  async getReporteAuditoria(fechaDesde: Date, fechaHasta: Date) {
    const where = {
      fecha: { gte: new Date(fechaDesde), lte: new Date(fechaHasta) },
    };
    const [totalEventos, porEvento, porEntidad, porUsuario] = await Promise.all([
      this.prisma.registroAuditoria.count({ where }),
      this.prisma.registroAuditoria.groupBy({
        by: ['evento'],
        where,
        _count: { evento: true },
        orderBy: { _count: { evento: 'desc' } },
      }),
      this.prisma.registroAuditoria.groupBy({
        by: ['entidad'],
        where,
        _count: { entidad: true },
        orderBy: { _count: { entidad: 'desc' } },
      }),
      this.prisma.registroAuditoria.groupBy({
        by: ['id_usuario'],
        where: { ...where, id_usuario: { not: null } },
        _count: { id_usuario: true },
        orderBy: { _count: { id_usuario: 'desc' } },
        take: 20,
      }),
    ]);
    return { totalEventos, porEvento, porEntidad, topUsuarios: porUsuario };
  }
}