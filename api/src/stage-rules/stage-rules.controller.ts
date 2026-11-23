import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/auth.types';
import { StageRulesService } from './stage-rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { ReorderRulesDto } from './dto/reorder-rules.dto';

@Controller('stage-rules')
export class StageRulesController {
  constructor(private readonly regras: StageRulesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GESTOR)
  list(@CurrentUser() user: JwtPayload) {
    return this.regras.list(user.orgId);
  }

  @Post('padrao')
  @Roles(Role.ADMIN)
  criarPadrao(@CurrentUser() user: JwtPayload) {
    return this.regras.criarPadrao(user.orgId);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRuleDto) {
    return this.regras.create(user.orgId, dto);
  }

  // ATENÇÃO: 'reorder' precisa vir ANTES de ':id', senão o Nest acha que "reorder" é um id
  @Patch('reorder')
  @Roles(Role.ADMIN)
  reorder(@CurrentUser() user: JwtPayload, @Body() dto: ReorderRulesDto) {
    return this.regras.reorder(user.orgId, dto.ids);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.regras.update(user.orgId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.regras.remove(user.orgId, id);
  }
}