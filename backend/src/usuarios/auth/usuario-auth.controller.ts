import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Put,
  Param,
  Patch,
  Query,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsuarioAuthService } from './usuario-auth.service';
import { RegisterPersonaDto, LoginDto } from '../dto/usuarios.dto';

@Controller('api/v1/auth')
export class UsuarioAuthController {
  constructor(private readonly usuarioAuthService: UsuarioAuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterPersonaDto) {
    return this.usuarioAuthService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.usuarioAuthService.login(dto);
  }
}