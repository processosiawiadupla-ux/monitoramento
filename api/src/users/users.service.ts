import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

// Colunas que podem sair da API (sem o passwordHash!)
const CAMPOS_PUBLICOS = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.user.findMany({
      where: { organizationId: orgId },
      select: CAMPOS_PUBLICOS,
      orderBy: { name: 'asc' },
    });
  }

  async create(orgId: string, dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();

    const existe = await this.prisma.user.findUnique({ where: { email } });
    if (existe) {
      throw new ConflictException('Já existe um usuário com este e-mail.'); // 409
    }

    return this.prisma.user.create({
      data: {
        organizationId: orgId,
        name: dto.name.trim(),
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: dto.role,
      },
      select: CAMPOS_PUBLICOS,
    });
  }
}