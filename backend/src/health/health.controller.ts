import { Controller, Get } from '@nestjs/common';

@Controller('api/v1')
export class HealthController {
  @Get('health')
  check() {
    return {
      status: 'ok',
      servicio: 'club-deportivo-api',
      timestamp: new Date().toISOString(),
    };
  }
}
