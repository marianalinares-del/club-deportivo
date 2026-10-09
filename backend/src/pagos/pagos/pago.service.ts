import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IReservaRepository, IPagoRepository } from '../../common/repositories/interfaces';
import { CreatePagoDto } from '../dto/pagos.dto';

@Injectable()
export class PagoService {
  constructor(
    @Inject('IReservaRepository') private reservaRepo: IReservaRepository,
    @Inject('IPagoRepository') private pagoRepo: IPagoRepository,
  ) {}

  /**
   * Registrar un pago para una reserva.
   * Como no hay gateway de pago real, se simula el registro.
   */
  async crearPago(dto: CreatePagoDto) {
    const reserva = await this.reservaRepo.findById(dto.id_reserva);

    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (reserva.estado === 'CANCELADA') {
      throw new BadRequestException('No se puede pagar una reserva cancelada');
    }

    // Registrar el pago en la tabla de auditoría (no hay tabla de pagos explícita en el esquema)
    // Usamos registros_auditoria para tracking de pagos
    const pago = await this.pagoRepo.createPagoRegistro({
      actor_tipo: 'USUARIO',
      id_usuario: reserva.id_persona,
      evento: 'PAGO_REGISTRADO',
      entidad: 'reservas',
      id_entidad: dto.id_reserva,
      detalle: {
        monto: dto.monto,
        metodo_pago: dto.metodo_pago || 'EFECTIVO',
        estado: 'COMPLETADO',
        fecha_pago: new Date().toISOString(),
      },
    });

    return {
      message: 'Pago registrado exitosamente',
      id_registro: pago.id_registro,
      monto: dto.monto,
      estado: 'COMPLETADO',
    };
  }

  /**
   * Consultar estado de pagos de una reserva.
   */
  async getPagosReserva(id_reserva: string) {
    const reserva = await this.reservaRepo.findById(id_reserva);

    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }

    const pagos = await this.pagoRepo.findPagosByReserva(id_reserva);

    return {
      id_reserva,
      monto_total: reserva.monto_total,
      pagos: pagos.map((p) => ({
        id: p.id_registro,
        evento: p.evento,
        detalle: p.detalle,
        fecha: p.fecha,
      })),
    };
  }

  /**
   * Listar todos los pagos (Admin/Gerente).
   */
  async listarPagos(filtros: { fecha_desde?: string; fecha_hasta?: string }) {
    return this.pagoRepo.findAllPagos({
      fechaDesde: filtros.fecha_desde ? new Date(filtros.fecha_desde) : undefined,
      fechaHasta: filtros.fecha_hasta ? new Date(filtros.fecha_hasta) : undefined,
    });
  }
}
