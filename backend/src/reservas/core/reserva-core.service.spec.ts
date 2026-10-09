import { ReservaCoreService } from './reserva-core.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('ReservaCoreService', () => {
  let service: ReservaCoreService;
  let mockReservaRepo: any;
  let mockEquipamientoRepo: any;
  let mockUsuarioRepo: any;

  beforeEach(() => {
    mockReservaRepo = {
      findById: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateEstado: jest.fn(),
      countConfirmadasByPersona: jest.fn(),
      findConflicto: jest.fn(),
      findFranjaById: jest.fn(),
    };

    mockEquipamientoRepo = {
      findById: jest.fn(),
      findMany: jest.fn(),
      updateStock: jest.fn(),
    };

    mockUsuarioRepo = {
      findUsuarioById: jest.fn(),
    };

    service = new ReservaCoreService(
      mockReservaRepo,
      mockEquipamientoRepo,
      mockUsuarioRepo,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listarReservas', () => {
    it('debe delegar los filtros en el repositorio', async () => {
      const fecha = new Date('2026-10-07');
      mockReservaRepo.findMany.mockResolvedValue([{ id_reserva: 'uuid-reserva-1' }]);

      const result = await service.listarReservas({
        id_persona: 'uuid-persona-1',
        fecha: '2026-10-07',
        estado: 'CONFIRMADA',
      });

      expect(mockReservaRepo.findMany).toHaveBeenCalledWith({
        id_persona: 'uuid-persona-1',
        fecha,
        estado: 'CONFIRMADA',
      });
      expect(result).toHaveLength(1);
    });

    it('debe enviar un where vacío cuando no hay filtros', async () => {
      mockReservaRepo.findMany.mockResolvedValue([]);

      await service.listarReservas({});

      expect(mockReservaRepo.findMany).toHaveBeenCalledWith({});
    });
  });

  describe('getReserva', () => {
    it('debe retornar la reserva cuando existe', async () => {
      mockReservaRepo.findById.mockResolvedValue({ id_reserva: 'uuid-reserva-1' });

      const result = await service.getReserva('uuid-reserva-1');

      expect(result).toHaveProperty('id_reserva', 'uuid-reserva-1');
    });

    it('debe lanzar NotFoundException si la reserva no existe', async () => {
      mockReservaRepo.findById.mockResolvedValue(null);

      await expect(service.getReserva('uuid-inexistente')).rejects.toThrow(NotFoundException);
    });
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

    beforeEach(() => {
      mockReservaRepo.findFranjaById.mockResolvedValue(mockFranja);
      mockReservaRepo.findConflicto.mockResolvedValue(null);
      mockUsuarioRepo.findUsuarioById.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
        estado: 'ACTIVO',
      });
      mockReservaRepo.countConfirmadasByPersona.mockResolvedValue(0);
      mockReservaRepo.create.mockResolvedValue({
        id_reserva: 'uuid-reserva-1',
        estado: 'CONFIRMADA',
      });
    });

    it('debe crear una reserva correctamente', async () => {
      const result = await service.crearReserva(createDto);

      expect(mockReservaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_franja: 'uuid-franja-1',
          id_persona: 'uuid-persona-1',
          origen: 'AUTOGESTIONADA',
          monto_total: mockFranja.cancha.precio_base,
        }),
      );
      expect(result).toHaveProperty('id_reserva');
      expect(result).toHaveProperty('estado', 'CONFIRMADA');
    });

    it('debe usar AUTOGESTIONADA como origen por defecto', async () => {
      await service.crearReserva(createDto);

      expect(mockReservaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ origen: 'AUTOGESTIONADA' }),
      );
    });

    it('debe lanzar NotFoundException si la franja no existe', async () => {
      mockReservaRepo.findFranjaById.mockResolvedValue(null);

      await expect(service.crearReserva(createDto)).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si la fecha no corresponde al día de la franja', async () => {
      mockReservaRepo.findFranjaById.mockResolvedValue({ ...mockFranja, dia_semana: 5 });

      await expect(service.crearReserva(createDto)).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si la cancha está en mantenimiento', async () => {
      mockReservaRepo.findFranjaById.mockResolvedValue({
        ...mockFranja,
        cancha: { ...mockFranja.cancha, estado: 'MANTENIMIENTO' },
      });

      await expect(service.crearReserva(createDto)).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar ConflictException si hay solapamiento de horario', async () => {
      mockReservaRepo.findConflicto.mockResolvedValue({
        id_reserva: 'uuid-conflicto',
        estado: 'CONFIRMADA',
      });

      await expect(service.crearReserva(createDto)).rejects.toThrow(ConflictException);
    });

    it('debe lanzar ForbiddenException si la persona no tiene usuario', async () => {
      mockUsuarioRepo.findUsuarioById.mockResolvedValue(null);

      await expect(service.crearReserva(createDto)).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar ForbiddenException si el usuario no está ACTIVO', async () => {
      mockUsuarioRepo.findUsuarioById.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
        estado: 'PENDIENTE',
      });

      await expect(service.crearReserva(createDto)).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar BadRequestException si ya posee 2 reservas confirmadas', async () => {
      mockReservaRepo.countConfirmadasByPersona.mockResolvedValue(2);

      await expect(service.crearReserva(createDto)).rejects.toThrow(BadRequestException);
    });
  });
});
