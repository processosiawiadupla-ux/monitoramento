import { Module } from '@nestjs/common';
import { StageRulesController } from './stage-rules.controller';
import { StageRulesService } from './stage-rules.service';

@Module({
  controllers: [StageRulesController],
  providers: [StageRulesService],
  exports: [StageRulesService],
})
export class StageRulesModule {}
