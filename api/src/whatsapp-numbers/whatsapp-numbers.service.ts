import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNumberDto } from './dto/create-number.dto';
import { UpdateNumberDto } from './dto/update-number.dto';

// O que sai da API sobre cada número
const SELECAO = {
  id: true,
  phone: true,
  label: true,
  active: true,
  createdAt: true,
  owner: { select: { id: true, name: true } },
  _count: { select: { conversations: true } },
} satisfies Prisma.WhatsAppNumberSelect;

@Injectable()
export class WhatsappNumbersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Deixa só os dígitos e garante o 55 do Brasil na frente. */
  private normalizarTelefone(bruto: string): string {
    let digitos = bruto.replace(/\D/g, '');
    if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
    if (digitos.length < 12 || digitos.length > 13) {
      throw new BadRequestException('Telefone inválido. Use DDD + número, ex.: (11) 98765-4321.');
    }
    return digitos;
  }

  /** A dona precisa ser um usuário ativo da mesma empresa. */
    /** A dona precisa ser uma VENDEDORA ativa da mesma empresa. */
  private async validarDona(orgId: string, ownerId: string | null | undefined) {
    if (!ownerId) return;
    const dona = await this.prisma.user.findFirst({
      where: { id: ownerId, organizationId: orgId, active: true, role: Role.VENDEDOR },
    });
    if (!dona) throw new BadRequestException('A dona do número precisa ser uma vendedora ativa.');
  }

  list(orgId: string) {
    return this.prisma.whatsAppNumber.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
      select: SELECAO,
    });
  }

  async create(orgId: string, dto: CreateNumberDto) {
    const phone = this.normalizarTelefone(dto.phone);

    const existe = await this.prisma.whatsAppNumber.findFirst({
      where: { organizationId: orgId, phone },
    });
    if (existe) throw new ConflictException('Este número já está cadastrado.');

    await this.validarDona(orgId, dto.ownerId);

    return this.prisma.whatsAppNumber.create({
      data: {
        organizationId: orgId,
        phone,
        label: dto.label.trim(),
        ownerId: dto.ownerId || null,
      },
      select: SELECAO,
    });
  }

  async update(orgId: string, id: string, dto: UpdateNumberDto) {
    const numero = await this.prisma.whatsAppNumber.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!numero) throw new NotFoundException('Número não encontrado.');

    await this.validarDona(orgId, dto.ownerId);

    const data: Prisma.WhatsAppNumberUncheckedUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label.trim();
    if (dto.ownerId !== undefined) data.ownerId = dto.ownerId || null;
    if (dto.active !== undefined) data.active = dto.active;

    return this.prisma.whatsAppNumber.update({ where: { id }, data, select: SELECAO });
  }
}