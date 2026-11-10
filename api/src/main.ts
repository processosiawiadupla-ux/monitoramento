import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Cria a aplicação a partir do módulo raiz (AppModule)
  const app = await NestFactory.create(AppModule);

  // Porta da API. Usamos 3333 porque a 3000 vai ficar para o painel (Next.js)
  await app.listen(process.env.PORT ?? 3333);
}
void bootstrap();