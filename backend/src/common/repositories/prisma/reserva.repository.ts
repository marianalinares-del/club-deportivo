import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IReservaRepository, ReservaFiltros, CreateReservaData } from '../interfaces';

@Injectable()
export class ReservaRepository implements IReservaRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.reserva.findUnique({
      where: { id_reserva: id },
      include: {
        franjaHoraria: {
          include: {
            cancha: { include: { disciplina: true } },
          },
        },
        persona: {
          include: {
            usuario: true,
            contactos: { where: { estado: 'ACTIVO' } },
          },
        },
        detallesAlquiler: { include: { equipamiento: true } },
      },
    });
  }

  async findMany(filtros: ReservaFiltros) {
    const where: any = {};
    if (filtros.id_persona) where.id_persona = filtros.id_persona;
    if (filtros.fecha) where.fecha = new Date(filtros.fecha);
    if (filtros.estado) where.estado = filtros.estado;

    return this.prisma.reserva.findMany({
      where,
      include: {
        franjaHoraria: {
          include: {
            cancha: { include: { disciplina: true } },
          },
        },
        persona: true,
        detallesAlquiler: { include: { equipamiento: true } },
      },
      orderBy: [{ fecha: 'desc' }, { creado_en: 'desc' }],
    });
  }

  async create(data: CreateReservaData) {
    return this.prisma.reserva.create({
      data: {
        id_franja: data.id_franja,
        fecha: data.fecha,
        id_persona: data.id_persona,
        origen: data.origen || 'AUTOGESTIONADA',
        monto_total: data.monto_total,
      },
      include: {
        franjaHoraria: {
          include: {
            cancha: { include: { disciplina: true } },
          },
        },
        persona: true,
      },
    });
  }

  async updateEstado(id: string, estado: string, canceladoEn?: Date) {
    const updateData: any = { estado };
    if (estado === 'CANCELADA') {
      updateData.cancelado_en = canceladoEn ?? new Date();
    }
    return this.prisma.reserva.update({
      where: { id_reserva: id },
      data: updateData,
      include: {
        franjaHoraria: { include: { cancha: { include: { disciplina: true } } } },
        persona: true,
        detallesAlquiler: true,
      },
    });
  }

  async countConfirmadasByPersona(idPersona: string): Promise<number> {
    return this.prisma.reserva.count({
      where: { id_persona: idPersona, estado: 'CONFIRMADA' },
    });
  }

  async findConflicto(idFranja: string, fecha: Date) {
    return this.prisma.reserva.findFirst({
      where: {
        id_franja: idFranja,
        fecha,
        estado: { in: ['CONFIRMADA', 'EN_CURSO'] },
      },
    });
  }

  async findFranjaById(idFranja: string) {
    return this.prisma.franjaHoraria.findUnique({
      where: { id_franja: idFranja },
      include: { cancha: true },
    });
  }

  async findCanchaById(idCancha: string) {
    return this.prisma.cancha.findUnique({
      where: { id_cancha: idCancha },
      include: { disciplina: true },
    });
  }

  async findFranjasByCanchaAndDia(idCancha: string, diaSemana: number) {
    return this.prisma.franjaHoraria.findMany({
      where: { id_cancha: idCancha, dia_semana: diaSemana },
      orderBy: { hora_inicio: 'asc' },
    });
  }

  async findReservasByFechaAndCancha(fecha: Date, idCancha: string) {
    return this.prisma.reserva.findMany({
      where: {
        fecha,
        estado: { in: ['CONFIRMADA', 'EN_CURSO'] },
        franjaHoraria: { id_cancha: idCancha },
      },
      select: { id_franja: true },
    });
  }
}