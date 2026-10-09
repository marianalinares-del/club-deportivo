import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsuarioRepository } from './repositories/prisma/usuario.repository';
import { ReservaRepository } from './repositories/prisma/reserva.repository';
import { EquipamientoRepository } from './repositories/prisma/equipamiento.repository';
import { PagoRepository } from './repositories/prisma/pago.repository';
import { AuditoriaRepository } from './repositories/prisma/auditoria.repository';
import { UserStatusProvider } from './repositories/prisma/user-status.provider';
import { ReservaStateMachine } from './state-machines/reserva.state-machine';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    { provide: 'IUsuarioRepository', useClass: UsuarioRepository },
    { provide: 'IReservaRepository', useClass: ReservaRepository },
    { provide: 'IEquipamientoRepository', useClass: EquipamientoRepository },
    { provide: 'IPagoRepository', useClass: PagoRepository },
    { provide: 'IAuditoriaRepository', useClass: AuditoriaRepository },
    { provide: 'IUserStatusProvider', useClass: UserStatusProvider },
    ReservaStateMachine,
  ],
  exports: [
    'IUsuarioRepository',
    'IReservaRepository',
    'IEquipamientoRepository',
    'IPagoRepository',
    'IAuditoriaRepository',
    'IUserStatusProvider',
    ReservaStateMachine,
  ],
})
export class CommonModule {}