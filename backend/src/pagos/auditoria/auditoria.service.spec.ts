import { AuditoriaService } from './auditoria.service';

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  let mockAuditoriaRepo: any;

  beforeEach(() => {
    mockAuditoriaRepo = {
      findMany: jest.fn(),
      groupByEvento: jest.fn(),
      groupByEntidad: jest.fn(),
      groupByUsuario: jest.fn(),
      count: jest.fn(),
    };

    service = new AuditoriaService(mockAuditoriaRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuditoria', () => {
    it('debe mapear los filtros del DTO a los del repositorio', async () => {
      mockAuditoriaRepo.findMany.mockResolvedValue([]);

      await service.getAuditoria({
        id_usuario: 'uuid-usuario-1',
        entidad: 'reservas',
        evento: 'PAGO_REGISTRADO',
        fecha_desde: '2026-10-01',
        fecha_hasta: '2026-10-31',
      });

      expect(mockAuditoriaRepo.findMany).toHaveBeenCalledWith({
        id_usuario: 'uuid-usuario-1',
        entidad: 'reservas',
        evento: 'PAGO_REGISTRADO',
        fecha_desde: new Date('2026-10-01'),
        fecha_hasta: new Date('2026-10-31'),
      });
    });

    it('debe enviar valores undefined cuando el DTO viene vacío', async () => {
      mockAuditoriaRepo.findMany.mockResolvedValue([]);

      await service.getAuditoria({});

      expect(mockAuditoriaRepo.findMany).toHaveBeenCalledWith({
        id_usuario: undefined,
        entidad: undefined,
        evento: undefined,
        fecha_desde: undefined,
        fecha_hasta: undefined,
      });
    });
  });

  describe('getReporteAuditoria', () => {
    it('debe construir el reporte con el período y los agrupados', async () => {
      mockAuditoriaRepo.count.mockResolvedValue(42);
      mockAuditoriaRepo.groupByEvento.mockResolvedValue([{ evento: 'PAGO_REGISTRADO', _count: 10 }]);
      mockAuditoriaRepo.groupByEntidad.mockResolvedValue([{ entidad: 'reservas', _count: 30 }]);
      mockAuditoriaRepo.groupByUsuario.mockResolvedValue([{ id_usuario: 'uuid-usuario-1', _count: 5 }]);

      const result = await service.getReporteAuditoria('2026-10-01', '2026-10-31');

      expect(mockAuditoriaRepo.count).toHaveBeenCalledWith(
        new Date('2026-10-01'),
        new Date('2026-10-31'),
      );
      expect(mockAuditoriaRepo.groupByEvento).toHaveBeenCalledWith(
        new Date('2026-10-01'),
        new Date('2026-10-31'),
      );
      expect(result).toEqual({
        periodo: { desde: '2026-10-01', hasta: '2026-10-31' },
        total_eventos: 42,
        por_evento: [{ evento: 'PAGO_REGISTRADO', _count: 10 }],
        por_entidad: [{ entidad: 'reservas', _count: 30 }],
        top_usuarios: [{ id_usuario: 'uuid-usuario-1', _count: 5 }],
      });
    });
  });
});
