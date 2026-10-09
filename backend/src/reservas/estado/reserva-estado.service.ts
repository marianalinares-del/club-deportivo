import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IReservaRepository, IUsuarioRepository } from '../../common/repositories/interfaces';
import { ReservaStateMachine, ReservaEstado, ReservaConFranja } from '../../common/state-machines/reserva.state-machine';
import { UpdateReservaEstadoDto } from '../dto/reservas.dto';

@Injectable()
export class ReservaEstadoService {
  constructor(
    @Inject('IReservaRepository') private reservaRepo: IReservaRepository,
    @Inject('IUsuarioRepository') private usuarioRepo: IUsuarioRepository,
  ) {}

  async actualizarEstadoReserva(id: string, dto: UpdateReservaEstadoDto) {
    const reserva = await this.getReserva(id);

    ReservaStateMachine.validarTransicion(reserva.estado as ReservaEstado, dto.estado as ReservaEstado, {
      ...reserva,
      origen: reserva.origen,
      fecha: new Date(reserva.fecha),
      id_franja: reserva.id_franja,
      franjaHoraria: reserva.franjaHoraria ? {
        hora_inicio: new Date(reserva.franjaHoraria.hora_inicio),
        hora_fin: new Date(reserva.franjaHoraria.hora_fin),
      } : undefined,
    } as ReservaConFranja);

    const updateData: any = { estado: dto.estado };
    if (dto.estado === 'CANCELADA') {
      updateData.cancelado_en = new Date();
    }

    return this.reservaRepo.updateEstado(id, dto.estado, updateData.cancelado_en);
  }

  async cancelarReservaAutogestionada(id: string, userId?: string) {
    const reserva = await this.getReserva(id);

    const usuario = userId ? await this.usuarioRepo.findUsuarioById(userId) : null;
    if (!usuario || usuario.id_usuario !== reserva.id_persona) {
      throw new ForbiddenException('No puedes cancelar una reserva de otro usuario');
    }

    if (reserva.estado !== 'CONFIRMADA') {
      throw new BadRequestException(`Transición de estado inválida: ${reserva.estado} -> CANCELADA`);
    }

    ReservaStateMachine.validarTransicion('CONFIRMADA', 'CANCELADA', {
      ...reserva,
      origen: reserva.origen,
      fecha: new Date(reserva.fecha),
      id_franja: reserva.id_franja,
      franjaHoraria: reserva.franjaHoraria ? {
        hora_inicio: new Date(reserva.franjaHoraria.hora_inicio),
        hora_fin: new Date(reserva.franjaHoraria.hora_fin),
      } : undefined,
    } as ReservaConFranja);

    return this.reservaRepo.updateEstado(id, 'CANCELADA', new Date());
  }

  private async getReserva(id: string) {
    const reserva = await this.reservaRepo.findById(id);
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }
    return reserva;
  }
}