import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { UsuarioAuthController } from './auth/usuario-auth.controller';
import { UsuarioProfileController } from './profile/usuario-profile.controller';
import { PermisoController } from './permisos/permiso.controller';
import { UsuarioAuthService } from './auth/usuario-auth.service';
import { UsuarioProfileService } from './profile/usuario-profile.service';
import { PermisoService } from './permisos/permiso.service';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [UsuarioAuthController, UsuarioProfileController, PermisoController],
  providers: [UsuarioAuthService, UsuarioProfileService, PermisoService],
  exports: [UsuarioAuthService, UsuarioProfileService, PermisoService],
})
export class UsuariosModule {}