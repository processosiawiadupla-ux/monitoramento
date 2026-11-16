import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Todas as rotas começam com /api
  app.setGlobalPrefix('api');

  // CORS: a "lista de visitantes autorizados".
  // Só o painel (endereço do .env) pode fazer pedidos para esta API pelo navegador.
  app.enableCors({ origin: process.env.WEB_URL ?? 'http://localhost:3000' });

  // Valida automaticamente os dados que chegam, usando as regras dos DTOs
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  // Desliga a conexão com o banco direitinho quando a API para
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3333);
}
void bootstrap();