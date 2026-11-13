import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class StagesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Busca um estágio ATIVO da empresa. Se não existir, 404. */
  private async findActive(orgId: string, id: string) {
    const stage = await this.prisma.stage.findFirst({
      where: { id, organizationId: orgId, archived: false },
    });
    if (!stage) throw new NotFoundException('Estágio não encontrado.');
    return stage;
  }

  /** Lista os estágios ativos na ordem do kanban, com quantas conversas há em cada. */
  list(orgId: string) {
    return this.prisma.stage.findMany({
      where: { organizationId: orgId, archived: false },
      orderBy: { position: 'asc' },
      include: { _count: { select: { conversations: true } } },
    });
  }

  /** Cria um estágio no fim do funil. */
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

  /** Renomeia, muda a cor ou o tipo. */
  async update(orgId: string, id: string, dto: UpdateStageDto) {
    await this.findActive(orgId, id);
    return this.prisma.stage.update({
      where: { id },
      data: { name: dto.name?.trim(), color: dto.color, kind: dto.kind },
    });
  }

  /** Muda a ordem das colunas. Recebe TODOS os ids ativos, na nova ordem. */
  async reorder(orgId: string, ids: string[]) {
    const ativos = await this.prisma.stage.findMany({
      where: { organizationId: orgId, archived: false },
      select: { id: true },
    });

    // A lista enviada precisa ter exatamente os mesmos estágios, sem faltar nem sobrar
    const idsAtivos = new Set(ativos.map((s) => s.id));
    const listaOk =
      ids.length === idsAtivos.size && new Set(ids).size === ids.length && ids.every((id) => idsAtivos.has(id));
    if (!listaOk) {
      throw new BadRequestException('Envie todos os estágios ativos, cada um uma vez, na nova ordem.');
    }

    // Grava a nova posição de cada um, tudo junto
    await this.prisma.$transaction(
      ids.map((id, position) => this.prisma.stage.update({ where: { id }, data: { position } })),
    );
    return this.list(orgId);
  }

  /**
   * Arquiva o estágio (some do kanban, mas continua no histórico).
   * Se ainda tiver conversas, é preciso dizer para qual estágio movê-las.
   */
  async archive(orgId: string, userId: string, id: string, moveTo?: string) {
    await this.findActive(orgId, id);

    const totalAtivos = await this.prisma.stage.count({
      where: { organizationId: orgId, archived: false },
    });
    if (totalAtivos <= 1) {
      throw new BadRequestException('O funil precisa ter pelo menos um estágio.');
    }

    const conversas = await this.prisma.conversation.findMany({
      where: { stageId: id },
      select: { id: true },
    });

    if (conversas.length > 0) {
      if (!moveTo) {
        throw new ConflictException(
          `Este estágio tem ${conversas.length} conversa(s). Informe para qual estágio movê-las (?moveTo=id).`,
        );
      }
      if (moveTo === id) {
        throw new BadRequestException('Escolha um estágio de destino diferente.');
      }
      await this.findActive(orgId, moveTo); // o destino precisa existir e estar ativo

      // Move as conversas, registra no histórico e arquiva: tudo junto
      await this.prisma.$transaction([
        this.prisma.conversation.updateMany({ where: { stageId: id }, data: { stageId: moveTo } }),
        this.prisma.stageChange.createMany({
          data: conversas.map((c) => ({
            conversationId: c.id,
            fromStageId: id,
            toStageId: moveTo,
            changedById: userId,
          })),
        }),
        this.prisma.stage.update({ where: { id }, data: { archived: true } }),
      ]);
    } else {
      await this.prisma.stage.update({ where: { id }, data: { archived: true } });
    }

    return { archived: true, movedConversations: conversas.length };
  }
}

