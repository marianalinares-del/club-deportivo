import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermisoService } from './permiso.service';
import { ResolverSolicitudDto } from '../dto/usuarios.dto';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';

@Controller('api/v1')
export class PermisoController {
  constructor(private readonly permisoService: PermisoService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERENTE', 'ADMINISTRADOR')
  @Get('permission-requests')
  async listarSolicitudes(@Query('estado') estado?: string) {
    return this.permisoService.listarSolicitudes(estado);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('GERENTE', 'ADMINISTRADOR')
  @Patch('permission-requests/:id')
  async resolverSolicitud(
    @Param('id') id: string,
    @Body() dto: ResolverSolicitudDto,
    @Request() req,
  ) {
    return this.permisoService.resolverSolicitud(id, dto, req.user.id_usuario);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Get('users')
  async listarUsuarios(
    @Query('rol') rol?: string,
    @Query('estado') estado?: string,
  ) {
    return this.permisoService.listarUsuarios(rol, estado);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMINISTRADOR')
  @Patch('users/:id/status')
  async cambiarEstadoUsuario(
    @Param('id') id: string,
    @Body('estado') estado: string,
  ) {
    return this.permisoService.cambiarEstadoUsuario(id, estado);
  }
}