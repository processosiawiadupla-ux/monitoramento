import { Body, Controller, Get, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/auth.types';
import { CreateStageDto } from './dto/create-stage.dto';
import { StagesService } from './stages.service';

@Controller('stages')
export class StagesController {
  constructor(private readonly stages: StagesService) {}

  // GET /api/stages  (qualquer usuário logado)
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.stages.list(user.orgId);
  }

  // POST /api/stages  (só ADMIN)
  @Post()
  @Roles(Role.ADMIN)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateStageDto) {
    return this.stages.create(user.orgId, dto);
  }
}