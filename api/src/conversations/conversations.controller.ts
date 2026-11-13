import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/auth.types';
import { ConversationsService } from './conversations.service';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { AssignDto } from './dto/assign.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  // GET /api/conversations?search=...&stageId=...&assignedToId=...
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() filters: ListConversationsDto) {
    return this.conversations.list(user, filters);
  }

  // GET /api/conversations/:id
  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.conversations.findOne(user, id);
  }

  // GET /api/conversations/:id/history
  @Get(':id/history')
  history(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.conversations.history(user, id);
  }

  // PATCH /api/conversations/:id/stage  -> é o que o "arrastar card" vai chamar
  @Patch(':id/stage')
  moveStage(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: MoveStageDto) {
    return this.conversations.moveStage(user, id, dto.stageId);
  }

  // PATCH /api/conversations/:id/assign  (só ADMIN e GESTOR)
  @Patch(':id/assign')
  @Roles(Role.ADMIN, Role.GESTOR)
  assign(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: AssignDto) {
    return this.conversations.assign(user, id, dto.assignedToId ?? null);
  }

  // PATCH /api/conversations/:id  (valor estimado)
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateConversationDto) {
    return this.conversations.update(user, id, dto.estimatedValue);
  }
}