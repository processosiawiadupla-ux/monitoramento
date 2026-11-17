import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/auth.types';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GESTOR)
  list(@CurrentUser() user: JwtPayload) {
    return this.users.list(user.orgId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GESTOR)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    return this.users.create(user, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.GESTOR)
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(user, id, dto);
  }
}