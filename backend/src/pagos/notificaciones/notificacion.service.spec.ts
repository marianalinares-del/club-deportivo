import { NotificacionService } from './notificacion.service';
import { NotFoundException } from '@nestjs/common';

describe('NotificacionService', () => {
  let service: NotificacionService;
  let mockUsuarioRepo: any;
  let mockAuditoriaRepo: any;

  beforeEach(() => {
    mockUsuarioRepo = {
      findUsuarioById: jest.fn(),
      findContactoByPersonaAndTipo: jest.fn(),
    };

    mockAuditoriaRepo = {
      createRegistro: jest.fn(),
    };

    service = new NotificacionService(mockUsuarioRepo, mockAuditoriaRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enviarNotificacion', () => {
    const params = {
      id_usuario: 'uuid-usuario-1',
      tipo: 'reserva_confirmada',
      mensaje: 'Su reserva fue confirmada',
      id_reserva: 'uuid-reserva-1',
    };

    it('debe registrar la notificación con el email activo del usuario', async () => {
      mockUsuarioRepo.findUsuarioById.mockResolvedValue({ id_usuario: 'uuid-usuario-1' });
      mockUsuarioRepo.findContactoByPersonaAndTipo.mockResolvedValue({
        id_contacto: 'uuid-contacto-1',
        valor_contacto: 'socio@club.com',
      });
      mockAuditoriaRepo.createRegistro.mockResolvedValue({ id_registro: 'uuid-audit-1' });

      const result = await service.enviarNotificacion(params);

      expect(mockUsuarioRepo.findContactoByPersonaAndTipo).toHaveBeenCalledWith(
        'uuid-usuario-1',
        'EMAIL',
      );
      expect(mockAuditoriaRepo.createRegistro).toHaveBeenCalledWith({
        actor_tipo: 'SISTEMA',
        id_usuario: 'uuid-usuario-1',
        evento: 'NOTIFICACION_RESERVA_CONFIRMADA',
        entidad: 'notificaciones',
        id_entidad: 'uuid-reserva-1',
        detalle: {
          email: 'socio@club.com',
          mensaje: 'Su reserva fue confirmada',
          enviado_en: expect.any(String),
        },
      });
      expect(result).toEqual({
        message: 'Notificación enviada (simulada)',
        email: 'socio@club.com',
        tipo: 'reserva_confirmada',
      });
    });

    it('debe usar sin-email cuando el usuario no tiene email activo', async () => {
      mockUsuarioRepo.findUsuarioById.mockResolvedValue({ id_usuario: 'uuid-usuario-1' });
      mockUsuarioRepo.findContactoByPersonaAndTipo.mockResolvedValue(null);
      mockAuditoriaRepo.createRegistro.mockResolvedValue({ id_registro: 'uuid-audit-1' });

      const result = await service.enviarNotificacion(params);

      expect(result).toHaveProperty('email', 'sin-email');
    });

    it('debe registrar id_entidad null cuando no se indica reserva', async () => {
      mockUsuarioRepo.findUsuarioById.mockResolvedValue({ id_usuario: 'uuid-usuario-1' });
      mockUsuarioRepo.findContactoByPersonaAndTipo.mockResolvedValue(null);
      mockAuditoriaRepo.createRegistro.mockResolvedValue({ id_registro: 'uuid-audit-1' });

      await service.enviarNotificacion({
        id_usuario: 'uuid-usuario-1',
        tipo: 'aviso',
        mensaje: 'Mensaje general',
      });

      expect(mockAuditoriaRepo.createRegistro).toHaveBeenCalledWith(
        expect.objectContaining({ id_entidad: null }),
      );
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      mockUsuarioRepo.findUsuarioById.mockResolvedValue(null);

      await expect(service.enviarNotificacion(params)).rejects.toThrow(NotFoundException);
      expect(mockAuditoriaRepo.createRegistro).not.toHaveBeenCalled();
    });
  });
});
