import { UsersModule } from './users/users.module';
import { StagesModule } from './stages/stages.module';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    StagesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guards GLOBAIS: valem para TODAS as rotas, nesta ordem.
    // Uma rota nova já nasce protegida; só fica aberta se tiver @Public().
    { provide: APP_GUARD, useClass: AuthGuard },  // 1º: está logado?
    { provide: APP_GUARD, useClass: RolesGuard }, // 2º: tem o papel exigido?
  ],
})
export class AppModule {}