import { Reserva, FranjaHoraria, Cancha, Disciplina, Persona, Prisma } from '@prisma/client';

export interface ReservaFiltros {
  id_persona?: string;
  fecha?: Date;
  estado?: string;
}

export interface CreateReservaData {
  id_franja: string;
  fecha: Date;
  id_persona: string;
  origen?: string;
  monto_total: number | Prisma.Decimal;
}

export interface ReservaWithRelations extends Reserva {
  franjaHoraria: FranjaHoraria & {
    cancha: Cancha & { disciplina: Disciplina };
  };
  persona: Persona;
}

export interface IReservaRepository {
  findById(id: string): Promise<ReservaWithRelations | null>;
  findMany(filtros: ReservaFiltros): Promise<ReservaWithRelations[]>;
  create(data: CreateReservaData): Promise<ReservaWithRelations>;
  updateEstado(id: string, estado: string, canceladoEn?: Date): Promise<ReservaWithRelations>;
  countConfirmadasByPersona(idPersona: string): Promise<number>;
  findConflicto(idFranja: string, fecha: Date): Promise<Reserva | null>;
  findFranjaById(idFranja: string): Promise<(FranjaHoraria & { cancha: Cancha }) | null>;
  findCanchaById(idCancha: string): Promise<Cancha | null>;
  findFranjasByCanchaAndDia(idCancha: string, diaSemana: number): Promise<FranjaHoraria[]>;
  findReservasByFechaAndCancha(fecha: Date, idCancha: string): Promise<Pick<Reserva, 'id_franja'>[]>;
}