import { Injectable, BadRequestException } from '@nestjs/common';

export type ReservaEstado = 'CONFIRMADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA';

export interface ReservaConFranja {
  id_reserva: string;
  estado: ReservaEstado;
  origen: string;
  fecha: Date;
  id_franja: string;
  franjaHoraria?: {
    hora_inicio: Date;
    hora_fin: Date;
  };
}

@Injectable()
export class ReservaStateMachine {
  private static readonly TRANSICIONES: Record<ReservaEstado, ReservaEstado[]> = {
    CONFIRMADA: ['EN_CURSO', 'CANCELADA'],
    EN_CURSO: ['COMPLETADA', 'CANCELADA'],
    COMPLETADA: [],
    CANCELADA: [],
  };

  static validarTransicion(estadoActual: ReservaEstado, nuevoEstado: ReservaEstado, reserva?: ReservaConFranja): void {
    const permitidas = this.TRANSICIONES[estadoActual] || [];
    if (!permitidas.includes(nuevoEstado)) {
      throw new BadRequestException(`Transición de estado inválida: ${estadoActual} -> ${nuevoEstado}`);
    }

    // Validaciones adicionales específicas
    if (nuevoEstado === 'CANCELADA' && reserva) {
      this.validarAnticipacionCancelacion(reserva);
    }
  }

  static getEstadosPermitidos(estadoActual: ReservaEstado): ReservaEstado[] {
    return [...(this.TRANSICIONES[estadoActual] || [])];
  }

  static esEstadoTerminal(estado: ReservaEstado): boolean {
    return this.TRANSICIONES[estado].length === 0;
  }

  private static validarAnticipacionCancelacion(reserva: ReservaConFranja): void {
    if (reserva.origen !== 'AUTOGESTIONADA') {
      return;
    }

    if (!reserva.franjaHoraria) {
      return;
    }

    const inicioTurno = new Date(reserva.fecha);
    const [h, m] = [
      reserva.franjaHoraria.hora_inicio.getUTCHours(),
      reserva.franjaHoraria.hora_inicio.getUTCMinutes(),
    ];
    inicioTurno.setUTCHours(h, m, 0, 0);

    const limiteCancelacion = new Date(inicioTurno.getTime() - 24 * 60 * 60 * 1000);

    if (new Date() > limiteCancelacion) {
      throw new BadRequestException('La cancelación requiere al menos 1 día de antelación');
    }
  }
}