import { AlquilerEquipamientoService } from './alquiler-equipamiento.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

describe('AlquilerEquipamientoService', () => {
  let service: AlquilerEquipamientoService;
  let mockReservaRepo: any;
  let mockEquipamientoRepo: any;
  let mockUsuarioRepo: any;

  beforeEach(() => {
    mockReservaRepo = {
      findById: jest.fn(),
      findFranjaById: jest.fn(),
    };

    mockEquipamientoRepo = {
      findById: jest.fn(),
      findMany: jest.fn(),
      updateStock: jest.fn(),
      createAlquiler: jest.fn(),
      findAlquilerByReservaAndEquipamiento: jest.fn(),
      findAllAlquileres: jest.fn(),
      findAlquilerById: jest.fn(),
      updateAlquilerDevolucion: jest.fn(),
    };

    mockUsuarioRepo = {
      findUsuarioById: jest.fn(),
    };

    service = new AlquilerEquipamientoService(
      mockReservaRepo,
      mockEquipamientoRepo,
      mockUsuarioRepo,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listarAlquileres', () => {
    it('debe listar todos los alquileres cuando no se filtra por reserva', async () => {
      mockEquipamientoRepo.findAllAlquileres.mockResolvedValue([{ id_detalle: 'uuid-det-1' }]);

      const result = await service.listarAlquileres();

      expect(mockEquipamientoRepo.findAllAlquileres).toHaveBeenCalledWith(undefined);
      expect(result).toHaveLength(1);
    });

    it('debe filtrar por reserva cuando se indica', async () => {
      mockEquipamientoRepo.findAllAlquileres.mockResolvedValue([]);

      await service.listarAlquileres('uuid-reserva-1');

      expect(mockEquipamientoRepo.findAllAlquileres).toHaveBeenCalledWith('uuid-reserva-1');
    });
  });

  describe('listarEquipamientos', () => {
    it('debe listar equipamientos filtrados por disciplina', async () => {
      mockEquipamientoRepo.findMany.mockResolvedValue([]);

      await service.listarEquipamientos('uuid-disc-1');

      expect(mockEquipamientoRepo.findMany).toHaveBeenCalledWith('uuid-disc-1');
    });
  });

  describe('crearAlquiler', () => {
    const alquilerDto = {
      id_reserva: 'uuid-reserva-1',
      id_equipamiento: 'uuid-equip-1',
      cantidad: 2,
    };

    const mockReserva = {
      id_reserva: 'uuid-reserva-1',
      id_persona: 'uuid-persona-1',
      id_franja: 'uuid-franja-1',
      estado: 'CONFIRMADA',
      fecha: new Date('2026-10-07'),
      franjaHoraria: {
        cancha: { id_disciplina: 'uuid-disc-1' },
      },
    };

    const mockEquipamiento = {
      id_equipamiento: 'uuid-equip-1',
      id_disciplina: 'uuid-disc-1',
      stock_disponible: 10,
      precio_alquiler: 500,
      nombre: 'Raqueta',
    };

    beforeEach(() => {
      mockReservaRepo.findById.mockResolvedValue(mockReserva);
      mockUsuarioRepo.findUsuarioById.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
        estado: 'ACTIVO',
      });
      mockEquipamientoRepo.findById.mockResolvedValue(mockEquipamiento);
      mockEquipamientoRepo.findAlquilerByReservaAndEquipamiento.mockResolvedValue(null);
      mockReservaRepo.findFranjaById.mockResolvedValue({
        id_franja: 'uuid-franja-1',
        hora_fin: new Date('1970-01-01T11:00:00Z'),
      });
      mockEquipamientoRepo.updateStock.mockResolvedValue({});
      mockEquipamientoRepo.createAlquiler.mockResolvedValue({
        id_detalle: 'uuid-det-1',
        ...alquilerDto,
      });
    });

    it('debe crear el alquiler y descontar el stock', async () => {
      const result = await service.crearAlquiler(alquilerDto);

      expect(mockEquipamientoRepo.updateStock).toHaveBeenCalledWith('uuid-equip-1', -2);
      expect(mockEquipamientoRepo.createAlquiler).toHaveBeenCalledWith(
        expect.objectContaining({
          id_reserva: 'uuid-reserva-1',
          id_equipamiento: 'uuid-equip-1',
          cantidad: 2,
          precio_unitario: 500,
          subtotal: 1000,
          fecha_devolucion_estimada: expect.any(Date),
        }),
      );
      expect(result).toHaveProperty('id_detalle');
    });

    it('debe lanzar NotFoundException si la reserva no existe', async () => {
      mockReservaRepo.findById.mockResolvedValue(null);

      await expect(service.crearAlquiler(alquilerDto)).rejects.toThrow(NotFoundException);
      expect(mockEquipamientoRepo.updateStock).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException si la reserva está cancelada', async () => {
      mockReservaRepo.findById.mockResolvedValue({ ...mockReserva, estado: 'CANCELADA' });

      await expect(service.crearAlquiler(alquilerDto)).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si la persona es un invitado sin usuario', async () => {
      mockUsuarioRepo.findUsuarioById.mockResolvedValue(null);

      await expect(service.crearAlquiler(alquilerDto)).rejects.toThrow(BadRequestException);
      expect(mockEquipamientoRepo.updateStock).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException si el usuario no está ACTIVO', async () => {
      mockUsuarioRepo.findUsuarioById.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
        estado: 'SUSPENDIDO',
      });

      await expect(service.crearAlquiler(alquilerDto)).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si el equipamiento no existe', async () => {
      mockEquipamientoRepo.findById.mockResolvedValue(null);

      await expect(service.crearAlquiler(alquilerDto)).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si la disciplina no coincide', async () => {
      mockEquipamientoRepo.findById.mockResolvedValue({
        ...mockEquipamiento,
        id_disciplina: 'uuid-disc-2',
      });

      await expect(service.crearAlquiler(alquilerDto)).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si no hay stock suficiente', async () => {
      mockEquipamientoRepo.findById.mockResolvedValue({ ...mockEquipamiento, stock_disponible: 1 });

      await expect(service.crearAlquiler(alquilerDto)).rejects.toThrow(BadRequestException);
      expect(mockEquipamientoRepo.updateStock).not.toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si ya existe el alquiler en la reserva', async () => {
      mockEquipamientoRepo.findAlquilerByReservaAndEquipamiento.mockResolvedValue({
        id_detalle: 'uuid-det-existente',
      });

      await expect(service.crearAlquiler(alquilerDto)).rejects.toThrow(ConflictException);
      expect(mockEquipamientoRepo.updateStock).not.toHaveBeenCalled();
    });

    it('debe dejar la fecha de devolución estimada en null si no hay franja', async () => {
      mockReservaRepo.findFranjaById.mockResolvedValue(null);

      await service.crearAlquiler(alquilerDto);

      expect(mockEquipamientoRepo.createAlquiler).toHaveBeenCalledWith(
        expect.objectContaining({ fecha_devolucion_estimada: null }),
      );
    });
  });

  describe('procesarDevolucion', () => {
    const mockDetalle = {
      id_detalle: 'uuid-det-1',
      id_equipamiento: 'uuid-equip-1',
      id_reserva: 'uuid-reserva-1',
      cantidad: 2,
      estado_devolucion: 'PENDIENTE',
    };

    it('debe restaurar el stock al devolver el equipamiento', async () => {
      mockEquipamientoRepo.findAlquilerById.mockResolvedValue(mockDetalle);
      mockEquipamientoRepo.updateAlquilerDevolucion.mockResolvedValue({
        ...mockDetalle,
        estado_devolucion: 'DEVUELTO',
      });

      const result = await service.procesarDevolucion('uuid-det-1', { estado_devolucion: 'DEVUELTO' });

      expect(mockEquipamientoRepo.updateStock).toHaveBeenCalledWith('uuid-equip-1', 2);
      expect(mockEquipamientoRepo.updateAlquilerDevolucion).toHaveBeenCalledWith(
        'uuid-det-1',
        'DEVUELTO',
        expect.any(Date),
      );
      expect(result).toHaveProperty('estado_devolucion', 'DEVUELTO');
    });

    it('debe restaurar el stock en una devolución tardía', async () => {
      mockEquipamientoRepo.findAlquilerById.mockResolvedValue(mockDetalle);
      mockEquipamientoRepo.updateAlquilerDevolucion.mockResolvedValue(mockDetalle);

      await service.procesarDevolucion('uuid-det-1', { estado_devolucion: 'DEVUELTO_TARDE' });

      expect(mockEquipamientoRepo.updateStock).toHaveBeenCalledWith('uuid-equip-1', 2);
    });

    it('no debe restaurar el stock si el equipamiento no fue devuelto', async () => {
      mockEquipamientoRepo.findAlquilerById.mockResolvedValue(mockDetalle);
      mockEquipamientoRepo.updateAlquilerDevolucion.mockResolvedValue(mockDetalle);

      await service.procesarDevolucion('uuid-det-1', { estado_devolucion: 'NO_DEVUELTO' });

      expect(mockEquipamientoRepo.updateStock).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si el detalle no existe', async () => {
      mockEquipamientoRepo.findAlquilerById.mockResolvedValue(null);

      await expect(
        service.procesarDevolucion('uuid-inexistente', { estado_devolucion: 'DEVUELTO' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si ya fue devuelto o cancelado', async () => {
      mockEquipamientoRepo.findAlquilerById.mockResolvedValue({
        ...mockDetalle,
        estado_devolucion: 'DEVUELTO',
      });

      await expect(
        service.procesarDevolucion('uuid-det-1', { estado_devolucion: 'DEVUELTO' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockEquipamientoRepo.updateStock).not.toHaveBeenCalled();
    });
  });
});
