import { UsuarioAuthService } from './usuario-auth.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('UsuarioAuthService', () => {
  let service: UsuarioAuthService;
  let mockUsuarioRepo: any;
  let mockJwtService: any;
  let mockTx: any;

  const registerDto = {
    nombre: 'Juan',
    apellido: 'Perez',
    dni: '30111222',
    email: 'juan@club.com',
    password: 'password123',
    telefono: '3511112222',
  };

  beforeEach(() => {
    mockTx = {
      createPersona: jest.fn(),
      createContacto: jest.fn(),
      createUsuario: jest.fn(),
      createSolicitudPermiso: jest.fn(),
    };

    mockUsuarioRepo = {
      findContactoByEmail: jest.fn().mockResolvedValue(null),
      findPersonaByDni: jest.fn().mockResolvedValue(null),
      findUsuarioByEmail: jest.fn(),
      findPersonaById: jest.fn(),
      transaction: jest.fn((cb: any) => cb(mockTx)),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    service = new UsuarioAuthService(mockUsuarioRepo, mockJwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    beforeEach(() => {
      mockTx.createPersona.mockResolvedValue({ id_persona: 'uuid-persona-1' });
      mockTx.createContacto.mockResolvedValue({ id_contacto: 'uuid-contacto-1' });
      mockTx.createUsuario.mockResolvedValue({ id_usuario: 'uuid-persona-1' });
      mockTx.createSolicitudPermiso.mockResolvedValue({ id_solicitud: 'uuid-solicitud-1' });
    });

    it('debe registrar la persona, el usuario SOCIO PENDIENTE y la solicitud', async () => {
      const result = await service.register(registerDto);

      expect(mockUsuarioRepo.transaction).toHaveBeenCalled();
      expect(mockTx.createPersona).toHaveBeenCalledWith(
        expect.objectContaining({
          dni: '30111222',
          nombre: 'Juan',
          apellido: 'Perez',
        }),
      );
      expect(mockTx.createUsuario).toHaveBeenCalledWith(
        expect.objectContaining({
          id_usuario: 'uuid-persona-1',
          id_contacto_login: 'uuid-contacto-1',
          rol: 'SOCIO',
          estado: 'PENDIENTE',
          password_hash: expect.any(String),
        }),
      );
      expect(mockTx.createSolicitudPermiso).toHaveBeenCalledWith({
        id_persona: 'uuid-persona-1',
        origen: 'AUTOREGISTRO',
        estado: 'PENDIENTE',
      });
      expect(result).toEqual({
        message: 'Registro exitoso. Su cuenta está pendiente de aprobación.',
        id_usuario: 'uuid-persona-1',
      });
    });

    it('debe crear un contacto de teléfono cuando se informa', async () => {
      await service.register(registerDto);

      expect(mockTx.createContacto).toHaveBeenCalledWith(
        expect.objectContaining({ tipo_contacto: 'TELEFONO', valor_contacto: '3511112222' }),
      );
    });

    it('no debe crear contacto de teléfono cuando no se informa', async () => {
      await service.register({ ...registerDto, telefono: undefined });

      expect(mockTx.createContacto).toHaveBeenCalledTimes(1);
      expect(mockTx.createContacto).toHaveBeenCalledWith(
        expect.objectContaining({ tipo_contacto: 'EMAIL' }),
      );
    });

    it('debe lanzar ConflictException si el email ya está registrado', async () => {
      mockUsuarioRepo.findContactoByEmail.mockResolvedValue({ id_contacto: 'uuid-contacto-1' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockUsuarioRepo.transaction).not.toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el DNI ya está registrado', async () => {
      mockUsuarioRepo.findPersonaByDni.mockResolvedValue({ id_persona: 'uuid-persona-1' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockUsuarioRepo.transaction).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('debe devolver el token y los datos del usuario', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      mockUsuarioRepo.findUsuarioByEmail.mockResolvedValue({
        id_usuario: 'uuid-usuario-1',
        rol: 'SOCIO',
        estado: 'ACTIVO',
        password_hash: passwordHash,
      });
      mockUsuarioRepo.findPersonaById.mockResolvedValue({
        id_persona: 'uuid-usuario-1',
        nombre: 'Juan',
        apellido: 'Perez',
      });

      const result = await service.login({ email: 'juan@club.com', password: 'password123' });

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'uuid-usuario-1',
        email: 'juan@club.com',
        rol: 'SOCIO',
      });
      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        usuario: {
          id_usuario: 'uuid-usuario-1',
          nombre: 'Juan',
          apellido: 'Perez',
          email: 'juan@club.com',
          rol: 'SOCIO',
          estado: 'ACTIVO',
        },
      });
    });

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      mockUsuarioRepo.findUsuarioByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noexiste@club.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si la cuenta no tiene contraseña', async () => {
      mockUsuarioRepo.findUsuarioByEmail.mockResolvedValue({
        id_usuario: 'uuid-usuario-1',
        rol: 'SOCIO',
        estado: 'ACTIVO',
        password_hash: null,
      });

      await expect(
        service.login({ email: 'juan@club.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si la contraseña es inválida', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      mockUsuarioRepo.findUsuarioByEmail.mockResolvedValue({
        id_usuario: 'uuid-usuario-1',
        rol: 'SOCIO',
        estado: 'ACTIVO',
        password_hash: '$2a$10$hashedpassword',
      });

      await expect(
        service.login({ email: 'juan@club.com', password: 'password-incorrecta' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si el usuario está suspendido', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      mockUsuarioRepo.findUsuarioByEmail.mockResolvedValue({
        id_usuario: 'uuid-usuario-1',
        rol: 'SOCIO',
        estado: 'SUSPENDIDO',
        password_hash: passwordHash,
      });

      await expect(
        service.login({ email: 'juan@club.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
