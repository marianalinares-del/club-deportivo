import { ReservasService } from './reservas.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('ReservasService', () => {
  let service: ReservasService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      franjaHoraria: {
        findUnique: jest.fn(),
      },
      reserva: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      usuario: {
        findUnique: jest.fn(),
      },
      equipamiento: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      detalleAlquilerEquipamiento: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(mockPrisma)),
    };

    service = new ReservasService(mockPrisma as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('crearReserva', () => {
    // 2026-10-07 es miércoles (día 3 en UTC)
    const createDto = {
      id_franja: 'uuid-franja-1',
      fecha: '2026-10-07',
      id_persona: 'uuid-persona-1',
    };

    const mockFranja = {
      id_franja: 'uuid-franja-1',
      id_cancha: 'uuid-cancha-1',
      dia_semana: 3, // Miércoles
      hora_inicio: '10:00',
      hora_fin: '11:00',
      cancha: {
        id_cancha: 'uuid-cancha-1',
        estado: 'DISPONIBLE',
        precio_base: 1500,
        disciplina: { nombre: 'Tenis' },
      },
    };

    it('debe crear una reserva correctamente', async () => {
      mockPrisma.franjaHoraria.findUnique.mockResolvedValue(mockFranja);
      mockPrisma.reserva.findFirst.mockResolvedValue(null);
      mockPrisma.usuario = {
        findUnique: jest.fn().mockResolvedValue({ id_usuario: 'uuid-persona-1', estado: 'ACTIVO' }),
      };
      mockPrisma.reserva.count.mockResolvedValue(0);
      mockPrisma.reserva.create.mockResolvedValue({
        id_reserva: 'uuid-reserva-1',
        ...createDto,
        estado: 'CONFIRMADA',
      });

      const result = await service.crearReserva(createDto);

      expect(result).toHaveProperty('id_reserva');
      expect(result).toHaveProperty('estado', 'CONFIRMADA');
    });

    it('debe lanzar NotFoundException si la franja no existe', async () => {
      mockPrisma.franjaHoraria.findUnique.mockResolvedValue(null);

      await expect(service.crearReserva(createDto)).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ConflictException si hay solapamiento de horario', async () => {
      mockPrisma.franjaHoraria.findUnique.mockResolvedValue(mockFranja);
      mockPrisma.reserva.findFirst.mockResolvedValue(
        { id_reserva: 'uuid-conflict', estado: 'CONFIRMADA' },
      );

      await expect(service.crearReserva(createDto)).rejects.toThrow(ConflictException);
    });

    it('debe lanzar BadRequestException si la cancha está en mantenimiento', async () => {
      mockPrisma.franjaHoraria.findUnique.mockResolvedValue({
        ...mockFranja,
        cancha: { ...mockFranja.cancha, estado: 'MANTENIMIENTO' },
      });

      await expect(service.crearReserva(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('crearAlquiler', () => {
    const alquilerDto = {
      id_reserva: 'uuid-reserva-1',
      id_equipamiento: 'uuid-equip-1',
      cantidad: 2,
    };

    it('debe crear un alquiler de equipamiento correctamente', async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        id_reserva: 'uuid-reserva-1',
        id_persona: 'uuid-persona-1',
        estado: 'CONFIRMADA',
        franjaHoraria: {
          cancha: { id_disciplina: 'uuid-disc-1' },
        },
      });
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
        estado: 'ACTIVO',
      });
      mockPrisma.equipamiento.findUnique.mockResolvedValue({
        id_equipamiento: 'uuid-equip-1',
        id_disciplina: 'uuid-disc-1',
        stock_disponible: 10,
        precio_alquiler: 500,
        nombre: 'Raqueta',
      });
      mockPrisma.detalleAlquilerEquipamiento.findUnique.mockResolvedValue(null);
      mockPrisma.franjaHoraria.findUnique.mockResolvedValue({
        id_franja: 'uuid-franja-1',
        hora_fin: new Date('1970-01-01T11:00:00Z'),
      });
      mockPrisma.equipamiento.update.mockResolvedValue({});
      mockPrisma.detalleAlquilerEquipamiento.create.mockResolvedValue({
        id_detalle: 'uuid-det-1',
        ...alquilerDto,
      });

      const result = await service.crearAlquiler(alquilerDto);

      expect(result).toHaveProperty('id_detalle');
    });

    it('debe lanzar BadRequestException si no hay stock suficiente', async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        id_reserva: 'uuid-reserva-1',
        id_persona: 'uuid-persona-1',
        estado: 'CONFIRMADA',
        franjaHoraria: {
          cancha: { id_disciplina: 'uuid-disc-1' },
        },
      });
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
        estado: 'ACTIVO',
      });
      mockPrisma.equipamiento.findUnique.mockResolvedValue({
        id_equipamiento: 'uuid-equip-1',
        id_disciplina: 'uuid-disc-1',
        stock_disponible: 1,
        nombre: 'Raqueta',
      });

      await expect(service.crearAlquiler(alquilerDto)).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si la disciplina no coincide', async () => {
      mockPrisma.reserva.findUnique.mockResolvedValue({
        id_reserva: 'uuid-reserva-1',
        id_persona: 'uuid-persona-1',
        estado: 'CONFIRMADA',
        franjaHoraria: {
          cancha: { id_disciplina: 'uuid-disc-1' },
        },
      });
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
        estado: 'ACTIVO',
      });
      mockPrisma.equipamiento.findUnique.mockResolvedValue({
        id_equipamiento: 'uuid-equip-1',
        id_disciplina: 'uuid-disc-2',
        stock_disponible: 10,
        nombre: 'Raqueta',
      });

      await expect(service.crearAlquiler(alquilerDto)).rejects.toThrow(BadRequestException);
    });
  });
});