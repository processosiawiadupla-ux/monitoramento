import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // lê o arquivo .env
    PrismaModule,                             // conexão com o banco
    HealthModule,                             // rota /api/health
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}