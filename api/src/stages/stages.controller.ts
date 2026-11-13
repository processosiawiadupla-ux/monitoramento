import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/auth.types';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
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

  // PATCH /api/stages/reorder  (só ADMIN)
  // ATENÇÃO: precisa vir ANTES do PATCH ':id'. Senão o NestJS acha que "reorder" é um id.
  @Patch('reorder')
  @Roles(Role.ADMIN)
  reorder(@CurrentUser() user: JwtPayload, @Body() dto: ReorderStagesDto) {
    return this.stages.reorder(user.orgId, dto.ids);
  }

  // PATCH /api/stages/:id  (só ADMIN)
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.stages.update(user.orgId, id, dto);
  }

  // DELETE /api/stages/:id?moveTo=<id>  (só ADMIN) -> arquiva
  @Delete(':id')
  @Roles(Role.ADMIN)
  archive(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Query('moveTo') moveTo?: string) {
    return this.stages.archive(user.orgId, user.sub, id, moveTo);
  }
}