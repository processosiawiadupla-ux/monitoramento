// GET /api/health -> confere se a API e o banco estão funcionando
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`; // pergunta simples ao banco
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'indisponível' });
    }
    return { status: 'ok', database: 'ok', time: new Date().toISOString() };
  }
}