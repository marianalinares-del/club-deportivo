import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IReservaRepository, IEquipamientoRepository, IUsuarioRepository } from '../../common/repositories/interfaces';
import { CreateReservaDto } from '../dto/reservas.dto';

@Injectable()
export class ReservaCoreService {
  constructor(
    @Inject('IReservaRepository') private reservaRepo: IReservaRepository,
    @Inject('IEquipamientoRepository') private equipamientoRepo: IEquipamientoRepository,
    @Inject('IUsuarioRepository') private usuarioRepo: IUsuarioRepository,
  ) {}

  async listarReservas(filtros: { id_persona?: string; fecha?: string; estado?: string }) {
    const where: any = {};
    if (filtros.id_persona) where.id_persona = filtros.id_persona;
    if (filtros.fecha) where.fecha = new Date(filtros.fecha);
    if (filtros.estado) where.estado = filtros.estado;
    return this.reservaRepo.findMany(where);
  }

  async getReserva(id: string) {
    const reserva = await this.reservaRepo.findById(id);
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }
    return reserva;
  }

  async crearReserva(dto: CreateReservaDto, userId?: string) {
    const fecha = new Date(dto.fecha);

    const franja = await this.reservaRepo.findFranjaById(dto.id_franja);
    if (!franja) {
      throw new NotFoundException('Franja horaria no encontrada');
    }

    const diaSemana = fecha.getUTCDay();
    if (franja.dia_semana !== diaSemana) {
      throw new BadRequestException('La fecha no corresponde al día de la semana de la franja');
    }

    if (franja.cancha.estado === 'MANTENIMIENTO') {
      throw new BadRequestException('La cancha se encuentra en mantenimiento');
    }

    const conflicto = await this.reservaRepo.findConflicto(dto.id_franja, fecha);
    if (conflicto) {
      throw new ConflictException('La franja ya está reservada para esta fecha');
    }

    const usuario = await this.usuarioRepo.findUsuarioById(dto.id_persona);
    if (!usuario) {
      throw new ForbiddenException('Solo usuarios registrados y activos pueden reservar');
    }

    if (usuario.estado !== 'ACTIVO') {
      throw new ForbiddenException('El usuario debe estar ACTIVO para reservar');
    }

    const count = await this.reservaRepo.countConfirmadasByPersona(dto.id_persona);
    if (count >= 2) {
      throw new BadRequestException('El usuario ya posee el máximo de 2 reservas confirmadas');
    }

    const reserva = await this.reservaRepo.create({
      id_franja: dto.id_franja,
      fecha,
      id_persona: dto.id_persona,
      origen: dto.origen || 'AUTOGESTIONADA',
      monto_total: franja.cancha.precio_base,
    });

    return reserva;
  }
}