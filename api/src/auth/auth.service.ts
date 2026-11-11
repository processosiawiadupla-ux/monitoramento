import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    // 1) Procura o usuário pelo e-mail
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // 2) Compara a senha digitada com o hash salvo no banco
    const senhaOk = user ? await bcrypt.compare(password, user.passwordHash) : false;

    // Mesma mensagem para "e-mail não existe" e "senha errada" (segurança)
    if (!user || !user.active || !senhaOk) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    // 3) Monta o conteúdo do token e assina
    const payload: JwtPayload = {
      sub: user.id,
      orgId: user.organizationId,
      role: user.role,
      name: user.name,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}