import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IUserStatusProvider } from '../common/repositories/interfaces';

/**
 * Guard que bloquea a usuarios suspendidos de realizar operaciones.
 */
@Injectable()
export class SuspendedUserGuard implements CanActivate {
  constructor(
    @Inject('IUserStatusProvider') private userStatusProvider: IUserStatusProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id_usuario;

    if (!userId) {
      return true; // Sin usuario autenticado, otros guards se encargarán
    }

    const estado = await this.userStatusProvider.getEstado(userId);

    if (estado === 'SUSPENDIDO') {
      throw new UnauthorizedException(
        'Usuario suspendido: no puede realizar reservas ni alquilar equipamiento',
      );
    }

    return true;
  }
}
