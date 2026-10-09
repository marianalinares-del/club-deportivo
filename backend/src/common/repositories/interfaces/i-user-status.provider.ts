export type UsuarioEstado = 'ACTIVO' | 'PENDIENTE' | 'SUSPENDIDO' | 'INACTIVO';
export type UsuarioRol = 'SOCIO' | 'GERENTE' | 'ADMINISTRADOR';

export interface IUserStatusProvider {
  getEstado(userId: string): Promise<UsuarioEstado | null>;
  getRol(userId: string): Promise<UsuarioRol | null>;
  isActive(userId: string): Promise<boolean>;
  isSuspended(userId: string): Promise<boolean>;
}