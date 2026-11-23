import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  get(orgId: string) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: { responseAlertMinutes: true },
    });
  }

  update(orgId: string, responseAlertMinutes: number) {
    return this.prisma.organization.update({
      where: { id: orgId },
      data: { responseAlertMinutes },
      select: { responseAlertMinutes: true },
    });
  }
}