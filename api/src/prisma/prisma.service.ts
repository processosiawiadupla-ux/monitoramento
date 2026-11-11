import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Conecta quando a API liga
  async onModuleInit() {
    await this.$connect();
  }

  // Desconecta quando a API desliga
  async onModuleDestroy() {
    await this.$disconnect();
  }
}