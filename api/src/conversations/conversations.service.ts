import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/auth.types';
import { ListConversationsDto } from './dto/list-conversations.dto';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * REGRA DE VISIBILIDADE (usada por todos os métodos):
   *   - todo mundo só vê conversas da própria empresa;
   *   - VENDEDOR só vê as conversas atribuídas a ele.
   */
  private visibleTo(user: JwtPayload): Prisma.ConversationWhereInput {
    const where: Prisma.ConversationWhereInput = { organizationId: user.orgId };
    if (user.role === Role.VENDEDOR) where.assignedToId = user.sub;
    return where;
  }

  /** Garante que a conversa existe e o usuário pode vê-la. Senão, 404. */
  private async ensureVisible(user: JwtPayload, id: string) {
    const conversa = await this.prisma.conversation.findFirst({
      where: { id, ...this.visibleTo(user) },
      select: { id: true, stageId: true },
    });
    if (!conversa) throw new NotFoundException('Conversa não encontrada.');
    return conversa;
  }

  // ---------------- LEITURA ----------------

  list(user: JwtPayload, filters: ListConversationsDto) {
    const where: Prisma.ConversationWhereInput = { ...this.visibleTo(user) };

    if (filters.stageId) where.stageId = filters.stageId;
    if (filters.assignedToId && user.role !== Role.VENDEDOR) {
      where.assignedToId = filters.assignedToId;
    }

    const termo = filters.search?.trim();
    if (termo) {
      const digitos = termo.replace(/\D/g, '');
      where.contact = {
        OR: [
          { name: { contains: termo, mode: 'insensitive' } },
          ...(digitos ? [{ phone: { contains: digitos } }] : []),
        ],
      };
    }

    return this.prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        contact: { select: { id: true, name: true, phone: true } },
        stage: { select: { id: true, name: true, color: true } },
        assignedTo: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, author: true, createdAt: true },
        },
      },
    });
  }

  async findOne(user: JwtPayload, id: string) {
    const conversa = await this.prisma.conversation.findFirst({
      where: { id, ...this.visibleTo(user) },
      include: {
        contact: true,
        stage: { select: { id: true, name: true, color: true, kind: true } },
        assignedTo: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sentBy: { select: { id: true, name: true } } },
        },
      },
    });
    if (!conversa) throw new NotFoundException('Conversa não encontrada.');
    return conversa;
  }

  /** Histórico de mudanças de estágio (quem moveu, de onde, para onde, quando). */
  async history(user: JwtPayload, id: string) {
    await this.ensureVisible(user, id);
    return this.prisma.stageChange.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        fromStage: { select: { name: true } },
        toStage: { select: { name: true } },
        changedBy: { select: { name: true } },
      },
    });
  }

  // ---------------- ALTERAÇÕES ----------------

  /** Move a conversa para outro estágio e grava no histórico. */
  async moveStage(user: JwtPayload, id: string, stageId: string) {
    const conversa = await this.ensureVisible(user, id);

    // Já está nesse estágio? Não faz nada.
    if (conversa.stageId === stageId) return this.findOne(user, id);

    // O estágio de destino precisa ser da MESMA empresa
    const destino = await this.prisma.stage.findFirst({
      where: { id: stageId, organizationId: user.orgId },
    });
    if (!destino) throw new BadRequestException('Estágio de destino inválido.');

    // Transação: as duas gravações acontecem juntas, ou nenhuma acontece.
    await this.prisma.$transaction([
      this.prisma.conversation.update({
        where: { id },
        data: { stageId, aiSuggestedStageId: null, aiSuggestionReason: null },
      }),
      this.prisma.stageChange.create({
        data: {
          conversationId: id,
          fromStageId: conversa.stageId,
          toStageId: stageId,
          changedById: user.sub,
        },
      }),
    ]);

    return this.findOne(user, id);
  }

  /** Atribui (ou remove) o vendedor responsável. Só ADMIN e GESTOR (controle no controller). */
  async assign(user: JwtPayload, id: string, assignedToId: string | null) {
    await this.ensureVisible(user, id);

    if (assignedToId) {
      const vendedor = await this.prisma.user.findFirst({
        where: { id: assignedToId, organizationId: user.orgId, active: true },
      });
      if (!vendedor) throw new BadRequestException('Vendedor inválido.');
    }

    await this.prisma.conversation.update({
      where: { id },
      data: { assignedToId: assignedToId ?? null },
    });
    return this.findOne(user, id);
  }

  /** Atualiza o valor estimado da venda. */
  async update(user: JwtPayload, id: string, estimatedValue: number | null | undefined) {
    await this.ensureVisible(user, id);
    await this.prisma.conversation.update({
      where: { id },
      data: { estimatedValue },
    });
    return this.findOne(user, id);
  }
}