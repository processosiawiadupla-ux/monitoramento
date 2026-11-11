import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Todas as rotas começam com /api
  app.setGlobalPrefix('api');

  // Valida automaticamente os dados que chegam, usando as regras dos DTOs
  //   whitelist: ignora campos que não estão no DTO
  //   forbidNonWhitelisted: e dá erro se mandarem campos extras
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  // Desliga a conexão com o banco direitinho quando a API para
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3333);
}
void bootstrap();