import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IReservaRepository, IEquipamientoRepository, IUsuarioRepository, CreateAlquilerData } from '../../common/repositories/interfaces';
import { CreateAlquilerEquipamientoDto, UpdateDevolucionDto } from '../dto/reservas.dto';

@Injectable()
export class AlquilerEquipamientoService {
  constructor(
    @Inject('IReservaRepository') private reservaRepo: IReservaRepository,
    @Inject('IEquipamientoRepository') private equipamientoRepo: IEquipamientoRepository,
    @Inject('IUsuarioRepository') private usuarioRepo: IUsuarioRepository,
  ) {}

  async listarAlquileres(id_reserva?: string) {
    return this.equipamientoRepo.findAllAlquileres(id_reserva);
  }

  async listarEquipamientos(id_disciplina?: string) {
    return this.equipamientoRepo.findMany(id_disciplina);
  }

  async crearAlquiler(dto: CreateAlquilerEquipamientoDto) {
    const reserva = await this.reservaRepo.findById(dto.id_reserva);
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (reserva.estado === 'CANCELADA') {
      throw new BadRequestException('No se puede alquilar en una reserva cancelada');
    }

    const usuario = await this.usuarioRepo.findUsuarioById(reserva.id_persona);
    if (!usuario) {
      throw new BadRequestException('Un invitado no puede alquilar equipamiento');
    }

    if (usuario.estado !== 'ACTIVO') {
      throw new BadRequestException('El usuario debe estar ACTIVO para alquilar equipamiento');
    }

    const equipamiento = await this.equipamientoRepo.findById(dto.id_equipamiento);
    if (!equipamiento) {
      throw new NotFoundException('Equipamiento no encontrado');
    }

    if (equipamiento.id_disciplina !== reserva.franjaHoraria.cancha.id_disciplina) {
      throw new BadRequestException('El equipamiento no corresponde a la disciplina de la cancha');
    }

    if (equipamiento.stock_disponible < dto.cantidad) {
      throw new BadRequestException('Stock insuficiente');
    }

    const existente = await this.equipamientoRepo.findAlquilerByReservaAndEquipamiento(dto.id_reserva, dto.id_equipamiento);
    if (existente) {
      throw new ConflictException('Ya existe un alquiler de este equipamiento en la reserva');
    }

    const franja = await this.reservaRepo.findFranjaById(reserva.id_franja);
    let fechaDevolucionEstimada: Date | null = null;
    if (franja) {
      fechaDevolucionEstimada = new Date(reserva.fecha);
      fechaDevolucionEstimada.setUTCHours(
        new Date(franja.hora_fin).getUTCHours(),
        new Date(franja.hora_fin).getUTCMinutes(),
        0,
        0,
      );
      fechaDevolucionEstimada = new Date(fechaDevolucionEstimada.getTime() + 15 * 60 * 1000);
    }

    await this.equipamientoRepo.updateStock(dto.id_equipamiento, -dto.cantidad);

    const alquiler = await this.equipamientoRepo.createAlquiler({
      id_reserva: dto.id_reserva,
      id_equipamiento: dto.id_equipamiento,
      cantidad: dto.cantidad,
      precio_unitario: equipamiento.precio_alquiler,
      subtotal: Number(equipamiento.precio_alquiler) * dto.cantidad,
      fecha_devolucion_estimada: fechaDevolucionEstimada,
    });

    return alquiler;
  }

  async procesarDevolucion(id_detalle: string, dto: UpdateDevolucionDto) {
    const detalle = await this.equipamientoRepo.findAlquilerById(id_detalle);
    if (!detalle) {
      throw new NotFoundException('Detalle de alquiler no encontrado');
    }

    if (detalle.estado_devolucion !== 'PENDIENTE') {
      throw new BadRequestException('El equipamiento ya fue devuelto o cancelado');
    }

    if (['DEVUELTO', 'DEVUELTO_TARDE'].includes(dto.estado_devolucion)) {
      await this.equipamientoRepo.updateStock(detalle.id_equipamiento, detalle.cantidad);
    }

    return this.equipamientoRepo.updateAlquilerDevolucion(id_detalle, dto.estado_devolucion, new Date());
  }
}