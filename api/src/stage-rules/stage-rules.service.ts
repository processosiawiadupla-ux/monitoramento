import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { RuleTrigger, StageKind, type StageRule } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ContextoRegra = {
  orgId: string;
  conversaId: string;
  direcao: 'ENTRADA' | 'SAIDA_APP';
  texto: string;
  primeiraResposta: boolean;
};

/** Minúsculas e sem acento: "Orçamento" -> "orcamento" */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

@Injectable()
export class StageRulesService {
  private readonly logger = new Logger(StageRulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.stageRule.findMany({
      where: { organizationId: orgId },
      orderBy: { position: 'asc' },
      include: { toStage: { select: { id: true, name: true, color: true } } },
    });
  }

  /** Avalia as regras para uma mensagem nova. Devolve true se a conversa mudou de estágio. */
  async aplicar(ctx: ContextoRegra): Promise<boolean> {
    const conversa = await this.prisma.conversation.findUnique({
      where: { id: ctx.conversaId },
      include: { stage: true },
    });
    if (!conversa) return false;

    // Trava 2: conversa já ganha ou perdida não se mexe
    if (conversa.stage.kind !== StageKind.OPEN) return false;

    const regras = await this.prisma.stageRule.findMany({
      where: { organizationId: ctx.orgId, active: true, toStage: { archived: false } },
      orderBy: { position: 'asc' },
      include: { toStage: true },
    });

    const texto = normalizar(ctx.texto);

    // Trava 3: a primeira regra da lista que combinar (e andar para frente) vence
    for (const regra of regras) {
      const motivo = this.combina(regra, ctx, texto);
      if (!motivo) continue;

      // Trava 1: só anda para frente
      if (regra.toStage.position <= conversa.stage.position) continue;

      await this.prisma.$transaction([
        this.prisma.conversation.update({
          where: { id: conversa.id },
          data: { stageId: regra.toStageId },
        }),
        this.prisma.stageChange.create({
          data: {
            conversationId: conversa.id,
            fromStageId: conversa.stageId,
            toStageId: regra.toStageId,
            reason: `Regra "${regra.name}": ${motivo}`,
          },
        }),
      ]);

      this.logger.log(`Conversa ${conversa.id}: ${conversa.stage.name} -> ${regra.toStage.name} (${motivo})`);
      return true;
    }
    return false;
  }

  /** A regra combina com a mensagem? Devolve o motivo, ou null. */
  private combina(regra: StageRule, ctx: ContextoRegra, texto: string): string | null {
    if (regra.trigger === RuleTrigger.FIRST_REPLY) {
      return ctx.direcao === 'SAIDA_APP' && ctx.primeiraResposta ? 'primeira resposta da vendedora' : null;
    }
    if (regra.trigger === RuleTrigger.INBOUND_KEYWORD && ctx.direcao !== 'ENTRADA') return null;
    if (regra.trigger === RuleTrigger.OUTBOUND_KEYWORD && ctx.direcao !== 'SAIDA_APP') return null;

    const palavra = regra.keywords.find((p) => p.trim() && texto.includes(normalizar(p.trim())));
    return palavra ? `mensagem com "${palavra}"` : null;
  }

  /** Cria o conjunto de regras padrão para a empresa (só se ainda não tiver nenhuma). */
  async criarPadrao(orgId: string) {
    const jaTem = await this.prisma.stageRule.count({ where: { organizationId: orgId } });
    if (jaTem > 0) throw new BadRequestException('Esta empresa já tem regras.');

    const estagios = await this.prisma.stage.findMany({
      where: { organizationId: orgId, archived: false },
      orderBy: { position: 'asc' },
    });
    const abertos = estagios.filter((s) => s.kind === StageKind.OPEN);
    const ganho = estagios.find((s) => s.kind === StageKind.WON);
    const perdido = estagios.find((s) => s.kind === StageKind.LOST);
    if (abertos.length < 4 || !ganho || !perdido) {
      throw new BadRequestException(
        'Para as regras padrão, a empresa precisa de 4 estágios abertos, 1 de venda ganha e 1 de perdida.',
      );
    }
    const [, qualificacao, proposta, negociacao] = abertos;

    // A ORDEM importa: a primeira que combinar vence
    const padrao = [
      {
        name: 'Venda fechada',
        trigger: RuleTrigger.INBOUND_KEYWORD,
        toStageId: ganho.id,
        keywords: ['fechado', 'fechou', 'pode emitir', 'comprovante', 'pix enviado', 'paguei', 'vou levar'],
      },
      {
        name: 'Desistência',
        trigger: RuleTrigger.INBOUND_KEYWORD,
        toStageId: perdido.id,
        keywords: ['não tenho interesse', 'não quero mais', 'desisti', 'comprei em outro', 'já comprei'],
      },
      {
        name: 'Cliente negociando',
        trigger: RuleTrigger.INBOUND_KEYWORD,
        toStageId: negociacao.id,
        keywords: ['desconto', 'parcela', 'parcelar', 'consegue fazer', 'melhor preço', 'abaixar'],
      },
      {
        name: 'Proposta enviada',
        trigger: RuleTrigger.OUTBOUND_KEYWORD,
        toStageId: proposta.id,
        keywords: ['proposta', 'orçamento', 'segue o valor', 'valor total', 'fica em r$'],
      },
      {
        name: 'Vendedora respondeu',
        trigger: RuleTrigger.FIRST_REPLY,
        toStageId: qualificacao.id,
        keywords: [],
      },
    ];

    await this.prisma.stageRule.createMany({
      data: padrao.map((r, i) => ({ ...r, organizationId: orgId, position: i })),
    });
    return this.list(orgId);
  
  }

    // ---------------- EDIÇÃO PELA TELA ----------------

  /** Tira espaços, linhas vazias e palavras repetidas */
  private limparPalavras(lista?: string[]): string[] {
    return [...new Set((lista ?? []).map((p) => p.trim()).filter(Boolean))];
  }

  /** Regra de palavra sem nenhuma palavra nunca dispararia */
  private validarPalavras(trigger: RuleTrigger, palavras: string[]) {
    if (trigger !== RuleTrigger.FIRST_REPLY && palavras.length === 0) {
      throw new BadRequestException('Informe pelo menos uma palavra para esta regra.');
    }
  }

  private async validarDestino(orgId: string, toStageId: string) {
    const estagio = await this.prisma.stage.findFirst({
      where: { id: toStageId, organizationId: orgId, archived: false },
    });
    if (!estagio) throw new BadRequestException('Estágio de destino inválido.');
  }

  private async garantirRegra(orgId: string, id: string) {
    const regra = await this.prisma.stageRule.findFirst({ where: { id, organizationId: orgId } });
    if (!regra) throw new NotFoundException('Regra não encontrada.');
    return regra;
  }

  async create(orgId: string, dto: CreateRuleDto) {
    const keywords = this.limparPalavras(dto.keywords);
    this.validarPalavras(dto.trigger, keywords);
    await this.validarDestino(orgId, dto.toStageId);

    // A regra nova entra no fim da lista
    const ultima = await this.prisma.stageRule.aggregate({
      where: { organizationId: orgId },
      _max: { position: true },
    });

    await this.prisma.stageRule.create({
      data: {
        organizationId: orgId,
        name: dto.name.trim(),
        trigger: dto.trigger,
        toStageId: dto.toStageId,
        keywords: dto.trigger === RuleTrigger.FIRST_REPLY ? [] : keywords,
        position: (ultima._max.position ?? -1) + 1,
      },
    });
    return this.list(orgId);
  }

  async update(orgId: string, id: string, dto: UpdateRuleDto) {
    const atual = await this.garantirRegra(orgId, id);

    const trigger = dto.trigger ?? atual.trigger;
    const keywords = dto.keywords !== undefined ? this.limparPalavras(dto.keywords) : atual.keywords;
    this.validarPalavras(trigger, keywords);
    if (dto.toStageId) await this.validarDestino(orgId, dto.toStageId);

    await this.prisma.stageRule.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        trigger: dto.trigger,
        toStageId: dto.toStageId,
        active: dto.active,
        keywords: trigger === RuleTrigger.FIRST_REPLY ? [] : keywords,
      },
    });
    return this.list(orgId);
  }

  async remove(orgId: string, id: string) {
    await this.garantirRegra(orgId, id);
    await this.prisma.stageRule.delete({ where: { id } });
    return this.list(orgId);
  }

  /** Recebe TODOS os ids na nova ordem */
  async reorder(orgId: string, ids: string[]) {
    const existentes = await this.prisma.stageRule.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });
    const mesmoConjunto =
      existentes.length === ids.length && existentes.every((r) => ids.includes(r.id));
    if (!mesmoConjunto) throw new BadRequestException('A lista de regras está incompleta ou desatualizada.');

    await this.prisma.$transaction(
      ids.map((id, position) => this.prisma.stageRule.update({ where: { id }, data: { position } })),
    );
    return this.list(orgId);
  }
}
