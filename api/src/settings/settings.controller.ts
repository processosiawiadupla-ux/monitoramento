import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/auth.types';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  // Todo usuário logado pode LER (o pipeline precisa do limite)
  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.settings.get(user.orgId);
  }

  // Só o admin MUDA
  @Patch()
  @Roles(Role.ADMIN)
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSettingsDto) {
    return this.settings.update(user.orgId, dto.responseAlertMinutes);
  }
}