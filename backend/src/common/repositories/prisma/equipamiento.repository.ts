import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IEquipamientoRepository, CreateAlquilerData } from '../interfaces';

@Injectable()
export class EquipamientoRepository implements IEquipamientoRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.equipamiento.findUnique({ where: { id_equipamiento: id } });
  }

  async findMany(idDisciplina?: string) {
    const where = idDisciplina ? { id_disciplina: idDisciplina } : {};
    return this.prisma.equipamiento.findMany({
      where,
      include: { disciplina: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async updateStock(id: string, cantidad: number) {
    return this.prisma.equipamiento.update({
      where: { id_equipamiento: id },
      data: { stock_disponible: { increment: cantidad } },
    });
  }

  async createAlquiler(data: CreateAlquilerData) {
    return this.prisma.detalleAlquilerEquipamiento.create({
      data: {
        id_reserva: data.id_reserva,
        id_equipamiento: data.id_equipamiento,
        cantidad: data.cantidad,
        precio_unitario: data.precio_unitario,
        subtotal: data.subtotal,
        fecha_devolucion_estimada: data.fecha_devolucion_estimada,
      },
      include: {
        equipamiento: true,
        reserva: {
          include: {
            persona: true,
            franjaHoraria: { include: { cancha: { include: { disciplina: true } } } },
          },
        },
      },
    });
  }

  async findAlquilerByReservaAndEquipamiento(idReserva: string, idEquipamiento: string) {
    return this.prisma.detalleAlquilerEquipamiento.findUnique({
      where: { id_reserva_id_equipamiento: { id_reserva: idReserva, id_equipamiento: idEquipamiento } },
    });
  }

  async findAlquileresByReserva(idReserva: string) {
    return this.prisma.detalleAlquilerEquipamiento.findMany({
      where: { id_reserva: idReserva },
      include: {
        equipamiento: true,
        reserva: {
          include: {
            persona: true,
            franjaHoraria: { include: { cancha: { include: { disciplina: true } } } },
          },
        },
      },
      orderBy: { creado_en: 'desc' },
    });
  }

  async findAllAlquileres(idReserva?: string) {
    const where = idReserva ? { id_reserva: idReserva } : {};
    return this.prisma.detalleAlquilerEquipamiento.findMany({
      where,
      include: {
        equipamiento: true,
        reserva: {
          include: {
            persona: true,
            franjaHoraria: { include: { cancha: { include: { disciplina: true } } } },
          },
        },
      },
      orderBy: { creado_en: 'desc' },
    });
  }

  async updateAlquilerDevolucion(idDetalle: string, estadoDevolucion: string, fechaDevolucionReal: Date) {
    return this.prisma.detalleAlquilerEquipamiento.update({
      where: { id_detalle: idDetalle },
      data: { estado_devolucion: estadoDevolucion, fecha_devolucion_real: fechaDevolucionReal },
      include: {
        equipamiento: true,
        reserva: {
          include: {
            persona: true,
            franjaHoraria: { include: { cancha: { include: { disciplina: true } } } },
          },
        },
      },
    });
  }

  async findAlquilerById(idDetalle: string) {
    return this.prisma.detalleAlquilerEquipamiento.findUnique({
      where: { id_detalle: idDetalle },
      include: {
        equipamiento: true,
        reserva: {
          include: {
            persona: true,
            franjaHoraria: { include: { cancha: { include: { disciplina: true } } } },
          },
        },
      },
    });
  }
}