import { ActiveUserGuard } from './active-user.guard';
import { ForbiddenException } from '@nestjs/common';
import { IUserStatusProvider } from '../common/repositories/interfaces';

describe('ActiveUserGuard', () => {
  let guard: ActiveUserGuard;
  let mockProvider: any;

  const crearContexto = (userId?: string): any => ({
    switchToHttp: () => ({
      getRequest: () => ({ user: userId ? { id_usuario: userId } : undefined }),
    }),
  });

  beforeEach(() => {
    mockProvider = {
      getEstado: jest.fn(),
      getRol: jest.fn(),
      isActive: jest.fn(),
      isSuspended: jest.fn(),
    };

    guard = new ActiveUserGuard(mockProvider as IUserStatusProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe permitir el acceso a un usuario ACTIVO', async () => {
    mockProvider.getEstado.mockResolvedValue('ACTIVO');

    await expect(guard.canActivate(crearContexto('uuid-usuario-1'))).resolves.toBe(true);
    expect(mockProvider.getEstado).toHaveBeenCalledWith('uuid-usuario-1');
  });

  it('debe lanzar ForbiddenException si no hay usuario autenticado', async () => {
    await expect(guard.canActivate(crearContexto())).rejects.toThrow(ForbiddenException);
    expect(mockProvider.getEstado).not.toHaveBeenCalled();
  });

  it('debe lanzar ForbiddenException si el usuario no existe', async () => {
    mockProvider.getEstado.mockResolvedValue(null);

    await expect(guard.canActivate(crearContexto('uuid-inexistente'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('debe lanzar ForbiddenException si el usuario está PENDIENTE', async () => {
    mockProvider.getEstado.mockResolvedValue('PENDIENTE');

    await expect(guard.canActivate(crearContexto('uuid-usuario-1'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('debe lanzar ForbiddenException si el usuario está SUSPENDIDO', async () => {
    mockProvider.getEstado.mockResolvedValue('SUSPENDIDO');

    await expect(guard.canActivate(crearContexto('uuid-usuario-1'))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
