import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStageDto } from './dto/create-stage.dto';

@Injectable()
export class StagesService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista na ordem do kanban, com quantas conversas há em cada estágio
  list(orgId: string) {
    return this.prisma.stage.findMany({
      where: { organizationId: orgId },
      orderBy: { position: 'asc' },
      include: { _count: { select: { conversations: true } } },
    });
  }

  // Cria um estágio no fim do funil
  async create(orgId: string, dto: CreateStageDto) {
    const ultimo = await this.prisma.stage.findFirst({
      where: { organizationId: orgId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    return this.prisma.stage.create({
      data: {
        organizationId: orgId,
        name: dto.name.trim(),
        color: dto.color,
        kind: dto.kind,
        position: (ultimo?.position ?? -1) + 1,
      },
    });
  }
}