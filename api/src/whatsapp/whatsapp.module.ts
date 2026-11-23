import { Module } from '@nestjs/common';
import { EntradaService } from './entrada.service';
import { SimuladorController } from './simulador.controller';

@Module({
  controllers: [SimuladorController],
  providers: [EntradaService],
  exports: [EntradaService], // o adaptador da YCloud vai usar na semana que vem
})
export class WhatsappModule {}


