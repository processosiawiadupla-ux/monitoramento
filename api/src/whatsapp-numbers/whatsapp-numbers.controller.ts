import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/auth.types';
import { WhatsappNumbersService } from './whatsapp-numbers.service';
import { CreateNumberDto } from './dto/create-number.dto';
import { UpdateNumberDto } from './dto/update-number.dto';

@Controller('whatsapp-numbers')
export class WhatsappNumbersController {
  constructor(private readonly numeros: WhatsappNumbersService) {}

  // Gestor pode VER os números; só o admin altera
  @Get()
  @Roles(Role.ADMIN, Role.GESTOR)
  list(@CurrentUser() user: JwtPayload) {
    return this.numeros.list(user.orgId);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateNumberDto) {
    return this.numeros.create(user.orgId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateNumberDto) {
    return this.numeros.update(user.orgId, id, dto);
  }
}