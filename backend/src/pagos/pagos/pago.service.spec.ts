import { PagoService } from './pago.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PagoService', () => {
  let service: PagoService;
  let mockReservaRepo: any;
  let mockPagoRepo: any;

  beforeEach(() => {
    mockReservaRepo = {
      findById: jest.fn(),
    };

    mockPagoRepo = {
      createPagoRegistro: jest.fn(),
      findPagosByReserva: jest.fn(),
      findAllPagos: jest.fn(),
    };

    service = new PagoService(mockReservaRepo, mockPagoRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('crearPago', () => {
    const pagoDto = {
      id_reserva: 'uuid-reserva-1',
      monto: 1500,
      metodo_pago: 'TRANSFERENCIA',
    };

    it('debe crear un pago y registrar en auditoría', async () => {
      mockReservaRepo.findById.mockResolvedValue({
        id_reserva: 'uuid-reserva-1',
        id_persona: 'uuid-persona-1',
        estado: 'CONFIRMADA',
      });
      mockPagoRepo.createPagoRegistro.mockResolvedValue({
        id_registro: 'uuid-audit-1',
        evento: 'PAGO_REGISTRADO',
      });

      const result = await service.crearPago(pagoDto);

      expect(mockPagoRepo.createPagoRegistro).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_tipo: 'USUARIO',
          id_usuario: 'uuid-persona-1',
          evento: 'PAGO_REGISTRADO',
          entidad: 'reservas',
          id_entidad: 'uuid-reserva-1',
          detalle: expect.objectContaining({
            monto: 1500,
            metodo_pago: 'TRANSFERENCIA',
            estado: 'COMPLETADO',
          }),
        }),
      );
      expect(result).toHaveProperty('id_registro');
      expect(result).toHaveProperty('estado', 'COMPLETADO');
    });

    it('debe usar EFECTIVO como método de pago por defecto', async () => {
      mockReservaRepo.findById.mockResolvedValue({
        id_reserva: 'uuid-reserva-1',
        id_persona: 'uuid-persona-1',
        estado: 'CONFIRMADA',
      });
      mockPagoRepo.createPagoRegistro.mockResolvedValue({ id_registro: 'uuid-audit-1' });

      await service.crearPago({ id_reserva: 'uuid-reserva-1', monto: 1500 });

      expect(mockPagoRepo.createPagoRegistro).toHaveBeenCalledWith(
        expect.objectContaining({
          detalle: expect.objectContaining({ metodo_pago: 'EFECTIVO' }),
        }),
      );
    });

    it('debe lanzar NotFoundException si la reserva no existe', async () => {
      mockReservaRepo.findById.mockResolvedValue(null);

      await expect(service.crearPago(pagoDto)).rejects.toThrow(NotFoundException);
      expect(mockPagoRepo.createPagoRegistro).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException si la reserva está cancelada', async () => {
      mockReservaRepo.findById.mockResolvedValue({
        id_reserva: 'uuid-reserva-1',
        id_persona: 'uuid-persona-1',
        estado: 'CANCELADA',
      });

      await expect(service.crearPago(pagoDto)).rejects.toThrow(BadRequestException);
      expect(mockPagoRepo.createPagoRegistro).not.toHaveBeenCalled();
    });
  });

  describe('getPagosReserva', () => {
    it('debe retornar el monto total y los pagos de la reserva', async () => {
      mockReservaRepo.findById.mockResolvedValue({
        id_reserva: 'uuid-reserva-1',
        id_persona: 'uuid-persona-1',
        estado: 'CONFIRMADA',
        monto_total: 1500,
      });
      mockPagoRepo.findPagosByReserva.mockResolvedValue([
        {
          id_registro: 'uuid-audit-1',
          evento: 'PAGO_REGISTRADO',
          detalle: { monto: 1500 },
          fecha: new Date('2026-10-07'),
        },
      ]);

      const result = await service.getPagosReserva('uuid-reserva-1');

      expect(mockPagoRepo.findPagosByReserva).toHaveBeenCalledWith('uuid-reserva-1');
      expect(result).toHaveProperty('monto_total', 1500);
      expect(result.pagos).toHaveLength(1);
      expect(result.pagos[0]).toEqual({
        id: 'uuid-audit-1',
        evento: 'PAGO_REGISTRADO',
        detalle: { monto: 1500 },
        fecha: expect.any(Date),
      });
    });

    it('debe lanzar NotFoundException si la reserva no existe', async () => {
      mockReservaRepo.findById.mockResolvedValue(null);

      await expect(service.getPagosReserva('uuid-inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listarPagos', () => {
    it('debe convertir las fechas a Date antes de delegar', async () => {
      mockPagoRepo.findAllPagos.mockResolvedValue([]);

      await service.listarPagos({ fecha_desde: '2026-10-01', fecha_hasta: '2026-10-31' });

      expect(mockPagoRepo.findAllPagos).toHaveBeenCalledWith({
        fechaDesde: new Date('2026-10-01'),
        fechaHasta: new Date('2026-10-31'),
      });
    });

    it('debe enviar filtros vacíos cuando no hay fechas', async () => {
      mockPagoRepo.findAllPagos.mockResolvedValue([]);

      await service.listarPagos({});

      expect(mockPagoRepo.findAllPagos).toHaveBeenCalledWith({
        fechaDesde: undefined,
        fechaHasta: undefined,
      });
    });
  });
});
