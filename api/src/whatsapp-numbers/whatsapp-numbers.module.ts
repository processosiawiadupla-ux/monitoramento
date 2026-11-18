import { Module } from '@nestjs/common';
import { WhatsappNumbersController } from './whatsapp-numbers.controller';
import { WhatsappNumbersService } from './whatsapp-numbers.service';

@Module({
  controllers: [WhatsappNumbersController],
  providers: [WhatsappNumbersService],
})
export class WhatsappNumbersModule {}