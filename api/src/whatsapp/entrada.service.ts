import { Injectable, Logger } from '@nestjs/common';
import { MessageAuthor, MessageDirection, StageKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type { MensagemPadrao } from './whatsapp.types';

/** O que aconteceu com a mensagem (útil para testar e para os logs) */
export type ResultadoEntrada =
  | { status: 'gravada'; conversaId: string; conversaNova: boolean }
  | { status: 'duplicada' }
  | { status: 'ignorada'; motivo: string };

@Injectable()
export class EntradaService {
  private readonly logger = new Logger(EntradaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async registrar(m: MensagemPadrao): Promise<ResultadoEntrada> {
    const numeroEmpresa = m.numeroEmpresa.replace(/\D/g, '');
    const telefoneCliente = m.telefoneCliente.replace(/\D/g, '');

    // 1) Já recebi esta mensagem?
    const repetida = await this.prisma.message.findUnique({ where: { waMessageId: m.idExterno } });
    if (repetida) return { status: 'duplicada' };

    // 2) Para qual número da empresa ela foi? (descobre a empresa e a dona)
    const numero = await this.prisma.whatsAppNumber.findFirst({
      where: { phone: numeroEmpresa, active: true },
    });
    if (!numero) {
      this.logger.warn(`Mensagem para número não cadastrado ou desativado: ${numeroEmpresa}`);
      return { status: 'ignorada', motivo: 'Número da empresa não cadastrado ou desativado.' };
    }
    const orgId = numero.organizationId;

    // 3) Conheço este cliente? Se não, cria o contato.
    let contato = await this.prisma.contact.upsert({
      where: { organizationId_phone: { organizationId: orgId, phone: telefoneCliente } },
      create: { organizationId: orgId, phone: telefoneCliente, name: m.nomeContato?.trim() || null },
      update: {},
    });
    // Se o contato não tinha nome e agora veio um, guarda (sem apagar nome que alguém já editou)
    if (!contato.name && m.nomeContato?.trim()) {
      contato = await this.prisma.contact.update({
        where: { id: contato.id },
        data: { name: m.nomeContato.trim() },
      });
    }

    // 4) Já existe conversa com este cliente neste número? Se não, cria em "Novo lead".
    let conversa = await this.prisma.conversation.findFirst({
      where: { organizationId: orgId, contactId: contato.id, whatsappNumberId: numero.id },
      orderBy: { lastMessageAt: 'desc' },
    });
    let conversaNova = false;

    if (!conversa) {
      const primeiroEstagio = await this.prisma.stage.findFirst({
        where: { organizationId: orgId, archived: false, kind: StageKind.OPEN },
        orderBy: { position: 'asc' },
      });
      if (!primeiroEstagio) {
        this.logger.error(`Empresa ${orgId} não tem estágio aberto para receber conversas.`);
        return { status: 'ignorada', motivo: 'A empresa não tem nenhum estágio aberto.' };
      }

      conversa = await this.prisma.conversation.create({
        data: {
          organizationId: orgId,
          contactId: contato.id,
          stageId: primeiroEstagio.id,
          whatsappNumberId: numero.id,
          assignedToId: numero.ownerId, // ← a atribuição automática (B43)
          lastMessageAt: m.quando,
        },
      });
      conversaNova = true;
    }

    // 5) Grava a mensagem e atualiza os horários da conversa
    const entrada = m.direcao === 'ENTRADA';
    await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: conversa.id,
          direction: entrada ? MessageDirection.INBOUND : MessageDirection.OUTBOUND,
          author: entrada ? MessageAuthor.CONTACT : MessageAuthor.USER,
          body: m.texto,
          waMessageId: m.idExterno,
          createdAt: m.quando,
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversa.id },
        data: {
          lastMessageAt: m.quando,
          ...(entrada ? { lastInboundAt: m.quando } : { lastOutboundAt: m.quando }),
        },
      }),
    ]);

    // 6) Avisa as telas (gestão + vendedora dona da conversa)
    this.realtime.conversaMudou(orgId, conversa.id, [conversa.assignedToId]);

    return { status: 'gravada', conversaId: conversa.id, conversaNova };
  }
}