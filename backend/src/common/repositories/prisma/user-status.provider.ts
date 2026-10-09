import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IUserStatusProvider, UsuarioEstado, UsuarioRol } from '../interfaces';

@Injectable()
export class UserStatusProvider implements IUserStatusProvider {
  constructor(private prisma: PrismaService) {}

  async getEstado(userId: string): Promise<UsuarioEstado | null> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      select: { estado: true },
    });
    return (usuario?.estado as UsuarioEstado) ?? null;
  }

  async getRol(userId: string): Promise<UsuarioRol | null> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      select: { rol: true },
    });
    return (usuario?.rol as UsuarioRol) ?? null;
  }

  async isActive(userId: string): Promise<boolean> {
    const estado = await this.getEstado(userId);
    return estado === 'ACTIVO';
  }

  async isSuspended(userId: string): Promise<boolean> {
    const estado = await this.getEstado(userId);
    return estado === 'SUSPENDIDO';
  }
}