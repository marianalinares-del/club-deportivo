import { Equipamiento, DetalleAlquilerEquipamiento, Reserva, Prisma } from '@prisma/client';

export interface CreateAlquilerData {
  id_reserva: string;
  id_equipamiento: string;
  cantidad: number;
  precio_unitario: number | Prisma.Decimal;
  subtotal: number;
  fecha_devolucion_estimada: Date | null;
}

export interface AlquilerWithRelations extends DetalleAlquilerEquipamiento {
  equipamiento: Equipamiento;
  reserva: Reserva & {
    persona: { nombre: string; apellido: string };
    franjaHoraria: { cancha: { id_disciplina: string } };
  };
}

export interface IEquipamientoRepository {
  findById(id: string): Promise<Equipamiento | null>;
  findMany(idDisciplina?: string): Promise<Equipamiento[]>;
  updateStock(id: string, cantidad: number): Promise<Equipamiento>;
  createAlquiler(data: CreateAlquilerData): Promise<AlquilerWithRelations>;
  findAlquilerByReservaAndEquipamiento(idReserva: string, idEquipamiento: string): Promise<DetalleAlquilerEquipamiento | null>;
  findAlquileresByReserva(idReserva: string): Promise<AlquilerWithRelations[]>;
  findAllAlquileres(idReserva?: string): Promise<AlquilerWithRelations[]>;
  updateAlquilerDevolucion(idDetalle: string, estadoDevolucion: string, fechaDevolucionReal: Date): Promise<AlquilerWithRelations>;
  findAlquilerById(idDetalle: string): Promise<AlquilerWithRelations | null>;
}