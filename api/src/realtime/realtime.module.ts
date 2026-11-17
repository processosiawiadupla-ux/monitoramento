import { Global, Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

// @Global: qualquer módulo pode usar o RealtimeGateway para avisar mudanças
@Global()
@Module({
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}