import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsuarioProfileService } from './usuario-profile.service';
import { UpdatePerfilDto } from '../dto/usuarios.dto';

@Controller('api/v1')
export class UsuarioProfileController {
  constructor(private readonly usuarioProfileService: UsuarioProfileService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getPerfil(@Request() req) {
    return this.usuarioProfileService.getPerfil(req.user.id_usuario);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  async updatePerfil(@Request() req, @Body() dto: UpdatePerfilDto) {
    return this.usuarioProfileService.updatePerfil(req.user.id_usuario, dto);
  }
}