import { Body, Controller, ForbiddenException, Get, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/auth.types';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@Roles(Role.ADMIN, Role.GESTOR) // vale para TODAS as rotas deste controller
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // GET /api/users
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.users.list(user.orgId); // orgId vem do TOKEN, nunca do que o usuário envia
  }

  // POST /api/users
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    if (dto.role === Role.ADMIN && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem criar outros administradores.');
    }
    return this.users.create(user.orgId, dto);
  }
}