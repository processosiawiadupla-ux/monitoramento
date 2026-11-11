import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Todas as rotas começam com /api (ex.: /api/health)
  app.setGlobalPrefix('api');

  // Desliga a conexão com o banco direitinho quando a API para
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3333);
}
void bootstrap();