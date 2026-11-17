import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/auth.types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Campos que podem sair da API. O passwordHash NUNCA sai.
const PUBLICO = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Todos os usuários da empresa, em ordem alfabética. */
  list(orgId: string) {
    return this.prisma.user.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
      select: PUBLICO,
    });
  }

  /** Cria um usuário. Só ADMIN pode criar outro ADMIN. */
  async create(autor: JwtPayload, dto: CreateUserDto) {
    if (dto.role === Role.ADMIN && autor.role !== Role.ADMIN) {
      throw new ForbiddenException('Só um administrador pode criar outro administrador.');
    }

    const email = dto.email.trim().toLowerCase();
    const existe = await this.prisma.user.findUnique({ where: { email } });
    if (existe) throw new ConflictException('Já existe um usuário com este e-mail.');

    return this.prisma.user.create({
      data: {
        organizationId: autor.orgId,
        name: dto.name.trim(),
        email,
        role: dto.role,
        passwordHash: await bcrypt.hash(dto.password, 10),
      },
      select: PUBLICO,
    });
  }

  /** Altera nome, papel, ativo ou senha, respeitando as regras. */
  async update(autor: JwtPayload, id: string, dto: UpdateUserDto) {
    // 1) O usuário existe e é da MESMA empresa?
    const alvo = await this.prisma.user.findFirst({
      where: { id, organizationId: autor.orgId },
    });
    if (!alvo) throw new NotFoundException('Usuário não encontrado.');

    // 2) Só ADMIN mexe em ADMIN ou promove alguém a ADMIN
    if (autor.role !== Role.ADMIN && (alvo.role === Role.ADMIN || dto.role === Role.ADMIN)) {
      throw new ForbiddenException('Só um administrador pode alterar administradores.');
    }

    // 3) Ninguém se desativa nem muda o próprio papel
    const ehEuMesmo = alvo.id === autor.sub;
    if (ehEuMesmo && (dto.active === false || (dto.role && dto.role !== alvo.role))) {
      throw new BadRequestException('Você não pode desativar nem mudar o próprio papel.');
    }

    // 4) Monta só o que veio no pedido
    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({ where: { id }, data, select: PUBLICO });
  }
}