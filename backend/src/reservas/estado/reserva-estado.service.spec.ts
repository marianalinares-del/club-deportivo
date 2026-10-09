import { ReservaEstadoService } from './reserva-estado.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ReservaEstadoService', () => {
  let service: ReservaEstadoService;
  let mockReservaRepo: any;
  let mockUsuarioRepo: any;

  beforeEach(() => {
    mockReservaRepo = {
      findById: jest.fn(),
      updateEstado: jest.fn(),
    };

    mockUsuarioRepo = {
      findUsuarioById: jest.fn(),
    };

    service = new ReservaEstadoService(mockReservaRepo, mockUsuarioRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('actualizarEstadoReserva', () => {
    const reservaConfirmada = {
      id_reserva: 'uuid-reserva-1',
      id_persona: 'uuid-persona-1',
      id_franja: 'uuid-franja-1',
      fecha: new Date('2026-10-15'),
      origen: 'MANUAL_GERENCIA',
      estado: 'CONFIRMADA',
      franjaHoraria: {
        hora_inicio: new Date('1970-01-01T12:00:00Z'),
        hora_fin: new Date('1970-01-01T13:00:00Z'),
      },
    };

    it('debe actualizar el estado cuando la transición es válida', async () => {
      mockReservaRepo.findById.mockResolvedValue(reservaConfirmada);
      mockReservaRepo.updateEstado.mockResolvedValue({
        ...reservaConfirmada,
        estado: 'EN_CURSO',
      });

      const result = await service.actualizarEstadoReserva('uuid-reserva-1', { estado: 'EN_CURSO' });

      expect(mockReservaRepo.updateEstado).toHaveBeenCalledWith('uuid-reserva-1', 'EN_CURSO', undefined);
      expect(result).toHaveProperty('estado', 'EN_CURSO');
    });

    it('debe registrar cancelado_en al cancelar', async () => {
      mockReservaRepo.findById.mockResolvedValue(reservaConfirmada);
      mockReservaRepo.updateEstado.mockResolvedValue({
        ...reservaConfirmada,
        estado: 'CANCELADA',
      });

      await service.actualizarEstadoReserva('uuid-reserva-1', { estado: 'CANCELADA' });

      expect(mockReservaRepo.updateEstado).toHaveBeenCalledWith(
        'uuid-reserva-1',
        'CANCELADA',
        expect.any(Date),
      );
    });

    it('debe lanzar NotFoundException si la reserva no existe', async () => {
      mockReservaRepo.findById.mockResolvedValue(null);

      await expect(
        service.actualizarEstadoReserva('uuid-inexistente', { estado: 'EN_CURSO' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si la transición no está permitida', async () => {
      mockReservaRepo.findById.mockResolvedValue(reservaConfirmada);

      await expect(
        service.actualizarEstadoReserva('uuid-reserva-1', { estado: 'COMPLETADA' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockReservaRepo.updateEstado).not.toHaveBeenCalled();
    });

    it('debe rechazar transiciones desde estados terminales', async () => {
      mockReservaRepo.findById.mockResolvedValue({ ...reservaConfirmada, estado: 'COMPLETADA' });

      await expect(
        service.actualizarEstadoReserva('uuid-reserva-1', { estado: 'EN_CURSO' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe validar la anticipación al cancelar una reserva autogestionada próxima', async () => {
      mockReservaRepo.findById.mockResolvedValue({
        ...reservaConfirmada,
        origen: 'AUTOGESTIONADA',
        fecha: new Date(Date.now() + 3 * 60 * 60 * 1000),
      });

      await expect(
        service.actualizarEstadoReserva('uuid-reserva-1', { estado: 'CANCELADA' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockReservaRepo.updateEstado).not.toHaveBeenCalled();
    });
  });

  describe('cancelarReservaAutogestionada', () => {
    const reservaConfirmada = {
      id_reserva: 'uuid-reserva-1',
      id_persona: 'uuid-persona-1',
      id_franja: 'uuid-franja-1',
      fecha: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      origen: 'AUTOGESTIONADA',
      estado: 'CONFIRMADA',
      franjaHoraria: {
        hora_inicio: new Date('1970-01-01T12:00:00Z'),
        hora_fin: new Date('1970-01-01T13:00:00Z'),
      },
    };

    it('debe cancelar la reserva con anticipación suficiente', async () => {
      mockReservaRepo.findById.mockResolvedValue(reservaConfirmada);
      mockUsuarioRepo.findUsuarioById.mockResolvedValue({ id_usuario: 'uuid-persona-1' });
      mockReservaRepo.updateEstado.mockResolvedValue({
        ...reservaConfirmada,
        estado: 'CANCELADA',
      });

      const result = await service.cancelarReservaAutogestionada('uuid-reserva-1', 'uuid-persona-1');

      expect(mockReservaRepo.updateEstado).toHaveBeenCalledWith(
        'uuid-reserva-1',
        'CANCELADA',
        expect.any(Date),
      );
      expect(result).toHaveProperty('estado', 'CANCELADA');
    });

    it('debe lanzar ForbiddenException si la reserva pertenece a otro usuario', async () => {
      mockReservaRepo.findById.mockResolvedValue(reservaConfirmada);
      mockUsuarioRepo.findUsuarioById.mockResolvedValue({ id_usuario: 'uuid-otro' });

      await expect(
        service.cancelarReservaAutogestionada('uuid-reserva-1', 'uuid-otro'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockReservaRepo.updateEstado).not.toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException si no se indica usuario', async () => {
      mockReservaRepo.findById.mockResolvedValue(reservaConfirmada);

      await expect(
        service.cancelarReservaAutogestionada('uuid-reserva-1', undefined),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar BadRequestException si la reserva no está CONFIRMADA', async () => {
      mockReservaRepo.findById.mockResolvedValue({
        ...reservaConfirmada,
        estado: 'COMPLETADA',
      });
      mockUsuarioRepo.findUsuarioById.mockResolvedValue({ id_usuario: 'uuid-persona-1' });

      await expect(
        service.cancelarReservaAutogestionada('uuid-reserva-1', 'uuid-persona-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si falta anticipación (menos de 24 horas)', async () => {
      mockReservaRepo.findById.mockResolvedValue({
        ...reservaConfirmada,
        fecha: new Date(Date.now() + 3 * 60 * 60 * 1000),
      });
      mockUsuarioRepo.findUsuarioById.mockResolvedValue({ id_usuario: 'uuid-persona-1' });

      await expect(
        service.cancelarReservaAutogestionada('uuid-reserva-1', 'uuid-persona-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockReservaRepo.updateEstado).not.toHaveBeenCalled();
    });

    it('debe permitir cancelar sin anticipación si la reserva es MANUAL_GERENCIA', async () => {
      mockReservaRepo.findById.mockResolvedValue({
        ...reservaConfirmada,
        origen: 'MANUAL_GERENCIA',
        fecha: new Date(Date.now() + 3 * 60 * 60 * 1000),
      });
      mockUsuarioRepo.findUsuarioById.mockResolvedValue({ id_usuario: 'uuid-persona-1' });
      mockReservaRepo.updateEstado.mockResolvedValue({
        ...reservaConfirmada,
        estado: 'CANCELADA',
      });

      await expect(
        service.cancelarReservaAutogestionada('uuid-reserva-1', 'uuid-persona-1'),
      ).resolves.toHaveProperty('estado', 'CANCELADA');
    });
  });
});
