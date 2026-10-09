import { PermisoService } from './permiso.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PermisoService', () => {
  let service: PermisoService;
  let mockUsuarioRepo: any;

  beforeEach(() => {
    mockUsuarioRepo = {
      findSolicitudById: jest.fn(),
      findManySolicitudes: jest.fn(),
      updateSolicitudPermiso: jest.fn(),
      findManyUsuarios: jest.fn(),
      findUsuarioById: jest.fn(),
      updateUsuarioEstado: jest.fn(),
    };

    service = new PermisoService(mockUsuarioRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listarSolicitudes', () => {
    it('debe filtrar por estado cuando se indica', async () => {
      mockUsuarioRepo.findManySolicitudes.mockResolvedValue([]);

      await service.listarSolicitudes('PENDIENTE');

      expect(mockUsuarioRepo.findManySolicitudes).toHaveBeenCalledWith({ estado: 'PENDIENTE' });
    });

    it('debe listar todas las solicitudes cuando no hay filtro', async () => {
      mockUsuarioRepo.findManySolicitudes.mockResolvedValue([]);

      await service.listarSolicitudes();

      expect(mockUsuarioRepo.findManySolicitudes).toHaveBeenCalledWith({ estado: undefined });
    });
  });

  describe('resolverSolicitud', () => {
    it('debe aprobar la solicitud y registrar el gestor y la fecha', async () => {
      mockUsuarioRepo.findSolicitudById.mockResolvedValue({
        id_solicitud: 'uuid-solicitud-1',
        id_persona: 'uuid-persona-1',
        estado: 'PENDIENTE',
      });
      mockUsuarioRepo.updateSolicitudPermiso.mockResolvedValue({ estado: 'APROBADA' });

      await service.resolverSolicitud('uuid-solicitud-1', { estado: 'APROBADA' }, 'uuid-gestor-1');

      expect(mockUsuarioRepo.updateSolicitudPermiso).toHaveBeenCalledWith('uuid-solicitud-1', {
        estado: 'APROBADA',
        id_gestor_aprobador: 'uuid-gestor-1',
        fecha_resolucion: expect.any(Date),
        id_usuario_generado: 'uuid-persona-1',
      });
    });

    it('no debe generar usuario cuando la solicitud es rechazada', async () => {
      mockUsuarioRepo.findSolicitudById.mockResolvedValue({
        id_solicitud: 'uuid-solicitud-1',
        id_persona: 'uuid-persona-1',
        estado: 'PENDIENTE',
      });
      mockUsuarioRepo.updateSolicitudPermiso.mockResolvedValue({ estado: 'RECHAZADA' });

      await service.resolverSolicitud('uuid-solicitud-1', { estado: 'RECHAZADA' }, 'uuid-gestor-1');

      expect(mockUsuarioRepo.updateSolicitudPermiso).toHaveBeenCalledWith('uuid-solicitud-1', {
        estado: 'RECHAZADA',
        id_gestor_aprobador: 'uuid-gestor-1',
        fecha_resolucion: expect.any(Date),
      });
    });

    it('debe lanzar NotFoundException si la solicitud no existe', async () => {
      mockUsuarioRepo.findSolicitudById.mockResolvedValue(null);

      await expect(
        service.resolverSolicitud('uuid-inexistente', { estado: 'APROBADA' }, 'uuid-gestor-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si la solicitud ya fue resuelta', async () => {
      mockUsuarioRepo.findSolicitudById.mockResolvedValue({
        id_solicitud: 'uuid-solicitud-1',
        estado: 'APROBADA',
      });

      await expect(
        service.resolverSolicitud('uuid-solicitud-1', { estado: 'APROBADA' }, 'uuid-gestor-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockUsuarioRepo.updateSolicitudPermiso).not.toHaveBeenCalled();
    });
  });

  describe('listarUsuarios', () => {
    it('debe filtrar por rol y estado', async () => {
      mockUsuarioRepo.findManyUsuarios.mockResolvedValue([]);

      await service.listarUsuarios('SOCIO', 'ACTIVO');

      expect(mockUsuarioRepo.findManyUsuarios).toHaveBeenCalledWith({
        rol: 'SOCIO',
        estado: 'ACTIVO',
      });
    });
  });

  describe('cambiarEstadoUsuario', () => {
    it('debe actualizar el estado del usuario', async () => {
      mockUsuarioRepo.findUsuarioById.mockResolvedValue({ id_usuario: 'uuid-usuario-1' });
      mockUsuarioRepo.updateUsuarioEstado.mockResolvedValue({ estado: 'SUSPENDIDO' });

      const result = await service.cambiarEstadoUsuario('uuid-usuario-1', 'SUSPENDIDO');

      expect(mockUsuarioRepo.updateUsuarioEstado).toHaveBeenCalledWith('uuid-usuario-1', 'SUSPENDIDO');
      expect(result).toHaveProperty('estado', 'SUSPENDIDO');
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      mockUsuarioRepo.findUsuarioById.mockResolvedValue(null);

      await expect(service.cambiarEstadoUsuario('uuid-inexistente', 'SUSPENDIDO')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
