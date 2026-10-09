import { SuspendedUserGuard } from './suspended-user.guard';
import { UnauthorizedException } from '@nestjs/common';
import { IUserStatusProvider } from '../common/repositories/interfaces';

describe('SuspendedUserGuard', () => {
  let guard: SuspendedUserGuard;
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

    guard = new SuspendedUserGuard(mockProvider as IUserStatusProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe permitir el acceso a un usuario ACTIVO', async () => {
    mockProvider.getEstado.mockResolvedValue('ACTIVO');

    await expect(guard.canActivate(crearContexto('uuid-usuario-1'))).resolves.toBe(true);
    expect(mockProvider.getEstado).toHaveBeenCalledWith('uuid-usuario-1');
  });

  it('debe permitir el acceso si no hay usuario autenticado', async () => {
    await expect(guard.canActivate(crearContexto())).resolves.toBe(true);
    expect(mockProvider.getEstado).not.toHaveBeenCalled();
  });

  it('debe permitir el acceso si el usuario no existe', async () => {
    mockProvider.getEstado.mockResolvedValue(null);

    await expect(guard.canActivate(crearContexto('uuid-inexistente'))).resolves.toBe(true);
  });

  it('debe lanzar UnauthorizedException si el usuario está SUSPENDIDO', async () => {
    mockProvider.getEstado.mockResolvedValue('SUSPENDIDO');

    await expect(guard.canActivate(crearContexto('uuid-usuario-1'))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
