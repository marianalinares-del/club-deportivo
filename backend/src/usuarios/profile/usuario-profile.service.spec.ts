import { UsuarioProfileService } from './usuario-profile.service';
import { NotFoundException } from '@nestjs/common';

describe('UsuarioProfileService', () => {
  let service: UsuarioProfileService;
  let mockUsuarioRepo: any;
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      updatePersona: jest.fn(),
      updateContactoEstado: jest.fn(),
      createContacto: jest.fn(),
      findContactoByPersonaAndTipo: jest.fn(),
    };

    mockUsuarioRepo = {
      findUsuarioById: jest.fn(),
      findPersonaById: jest.fn(),
      transaction: jest.fn((cb: any) => cb(mockTx)),
    };

    service = new UsuarioProfileService(mockUsuarioRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPerfil', () => {
    it('debe retornar el perfil con contactos y direcciones mapeados', async () => {
      mockUsuarioRepo.findPersonaById.mockResolvedValue({
        id_persona: 'uuid-persona-1',
        nombre: 'Juan',
        apellido: 'Perez',
        dni: '30111222',
        cuil: '20301112223',
        fecha_nacimiento: new Date('1990-05-01'),
        contactos: [{ tipo_contacto: 'EMAIL', valor_contacto: 'juan@club.com' }],
        direcciones: [
          {
            tipo_direccion: 'CASA',
            calle: 'Belgrano',
            numero: '123',
            localidad: 'Córdoba',
            provincia: 'Córdoba',
          },
        ],
      });
      mockUsuarioRepo.findUsuarioById.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
        rol: 'SOCIO',
        estado: 'ACTIVO',
      });

      const result = await service.getPerfil('uuid-persona-1');

      expect(result).toEqual({
        id_usuario: 'uuid-persona-1',
        nombre: 'Juan',
        apellido: 'Perez',
        dni: '30111222',
        cuil: '20301112223',
        fecha_nacimiento: new Date('1990-05-01'),
        rol: 'SOCIO',
        estado: 'ACTIVO',
        contactos: [{ tipo: 'EMAIL', valor: 'juan@club.com' }],
        direcciones: [
          {
            tipo: 'CASA',
            calle: 'Belgrano',
            numero: '123',
            localidad: 'Córdoba',
            provincia: 'Córdoba',
          },
        ],
      });
    });

    it('debe lanzar NotFoundException si la persona no existe', async () => {
      mockUsuarioRepo.findPersonaById.mockResolvedValue(null);

      await expect(service.getPerfil('uuid-inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePerfil', () => {
    beforeEach(() => {
      mockUsuarioRepo.findUsuarioById.mockResolvedValue({
        id_usuario: 'uuid-persona-1',
        id_contacto_login: 'uuid-contacto-1',
        rol: 'SOCIO',
        estado: 'ACTIVO',
      });
      mockUsuarioRepo.findPersonaById.mockResolvedValue({
        id_persona: 'uuid-persona-1',
        nombre: 'Juan',
        apellido: 'Perez',
        dni: '30111222',
        contactos: [],
        direcciones: [],
      });
    });

    it('debe actualizar nombre y apellido de la persona', async () => {
      await service.updatePerfil('uuid-persona-1', { nombre: 'Juan Carlos', apellido: 'Perez' });

      expect(mockTx.updatePersona).toHaveBeenCalledWith('uuid-persona-1', {
        nombre: 'Juan Carlos',
        apellido: 'Perez',
      });
    });

    it('debe inactivar el email anterior y crear uno nuevo', async () => {
      await service.updatePerfil('uuid-persona-1', { email: 'nuevo@club.com' });

      expect(mockTx.updateContactoEstado).toHaveBeenCalledWith(
        'uuid-contacto-1',
        'INACTIVO',
        expect.any(Date),
      );
      expect(mockTx.createContacto).toHaveBeenCalledWith({
        id_persona: 'uuid-persona-1',
        tipo_contacto: 'EMAIL',
        valor_contacto: 'nuevo@club.com',
        estado: 'ACTIVO',
      });
    });

    it('debe reemplazar el teléfono existente', async () => {
      mockTx.findContactoByPersonaAndTipo.mockResolvedValue({ id_contacto: 'uuid-tel-1' });

      await service.updatePerfil('uuid-persona-1', { telefono: '3519998888' });

      expect(mockTx.updateContactoEstado).toHaveBeenCalledWith(
        'uuid-tel-1',
        'INACTIVO',
        expect.any(Date),
      );
      expect(mockTx.createContacto).toHaveBeenCalledWith({
        id_persona: 'uuid-persona-1',
        tipo_contacto: 'TELEFONO',
        valor_contacto: '3519998888',
        estado: 'ACTIVO',
      });
    });

    it('debe retornar el perfil actualizado', async () => {
      const result = await service.updatePerfil('uuid-persona-1', { nombre: 'Juan Carlos' });

      expect(result).toHaveProperty('nombre', 'Juan');
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      mockUsuarioRepo.findUsuarioById.mockResolvedValue(null);

      await expect(
        service.updatePerfil('uuid-inexistente', { nombre: 'Juan' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockUsuarioRepo.transaction).not.toHaveBeenCalled();
    });
  });
});
