import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Inject } from '@nestjs/common';
import { IUsuarioRepository } from '../../common/repositories/interfaces';
import { RegisterPersonaDto, LoginDto } from '../dto/usuarios.dto';

@Injectable()
export class UsuarioAuthService {
  constructor(
    @Inject('IUsuarioRepository') private usuarioRepo: IUsuarioRepository,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterPersonaDto) {
    const emailExistente = await this.usuarioRepo.findContactoByEmail(dto.email);
    if (emailExistente) {
      throw new ConflictException('El email ya está registrado');
    }

    const dniExistente = await this.usuarioRepo.findPersonaByDni(dto.dni);
    if (dniExistente) {
      throw new ConflictException('El DNI ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.usuarioRepo.transaction(async (tx) => {
      const persona = await tx.createPersona({
        dni: dto.dni,
        cuil: dto.cuil,
        nombre: dto.nombre,
        apellido: dto.apellido,
        fecha_nacimiento: dto.fecha_nacimiento ? new Date(dto.fecha_nacimiento) : null,
      });

      const contacto = await tx.createContacto({
        id_persona: persona.id_persona,
        tipo_contacto: 'EMAIL',
        valor_contacto: dto.email.toLowerCase().trim(),
        estado: 'ACTIVO',
      });

      if (dto.telefono) {
        await tx.createContacto({
          id_persona: persona.id_persona,
          tipo_contacto: 'TELEFONO',
          valor_contacto: dto.telefono,
          estado: 'ACTIVO',
        });
      }

      const usuario = await tx.createUsuario({
        id_usuario: persona.id_persona,
        id_contacto_login: contacto.id_contacto,
        rol: 'SOCIO',
        estado: 'PENDIENTE',
        password_hash: passwordHash,
      });

      await tx.createSolicitudPermiso({
        id_persona: persona.id_persona,
        origen: 'AUTOREGISTRO',
        estado: 'PENDIENTE',
      });

      return {
        message: 'Registro exitoso. Su cuenta está pendiente de aprobación.',
        id_usuario: usuario.id_usuario,
      };
    });
  }

  async login(dto: LoginDto) {
    const usuario = await this.usuarioRepo.findUsuarioByEmail(dto.email);
    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.password_hash) {
      throw new UnauthorizedException('La cuenta no tiene contraseña configurada');
    }

    const passwordValida = await bcrypt.compare(dto.password, usuario.password_hash);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (usuario.estado === 'SUSPENDIDO') {
      throw new UnauthorizedException('Usuario suspendido. Contacte al administrador.');
    }

    const persona = await this.usuarioRepo.findPersonaById(usuario.id_usuario);

    const payload = {
      sub: usuario.id_usuario,
      email: dto.email,
      rol: usuario.rol,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: persona?.nombre,
        apellido: persona?.apellido,
        email: dto.email,
        rol: usuario.rol,
        estado: usuario.estado,
      },
    };
  }
}