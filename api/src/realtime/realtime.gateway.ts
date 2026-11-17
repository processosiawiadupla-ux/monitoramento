// A "central telefônica" do tempo real.
// Cada painel aberto se conecta aqui e entra nas salas que pode ouvir.
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Role } from '@prisma/client';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../auth/auth.types';

@WebSocketGateway({ cors: { origin: process.env.WEB_URL ?? 'http://localhost:3000' } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwt: JwtService) {}

  // Roda quando um painel se conecta
  async handleConnection(cliente: Socket) {
    const token = cliente.handshake.auth?.token as string | undefined;
    try {
      // Confere o crachá, igual ao porteiro das rotas
      const usuario = await this.jwt.verifyAsync<JwtPayload>(token ?? '');

      // Todo usuário ouve a própria sala
      await cliente.join(`user:${usuario.sub}`);

      // Admin e gestor também ouvem a sala da gestão da empresa
      if (usuario.role !== Role.VENDEDOR) {
        await cliente.join(`org:${usuario.orgId}:gestao`);
      }
    } catch {
      // Sem token válido: desliga a ligação
      this.logger.warn('Conexão recusada: token inválido');
      cliente.disconnect(true);
    }
  }

  conversaMudou(orgId: string, conversaId: string, vendedores: (string | null | undefined)[]) {
    const salas = [`org:${orgId}:gestao`, ...vendedores.filter((v): v is string => !!v).map((v) => `user:${v}`)];
    this.server.to(salas).emit('conversation.changed', { id: conversaId });
  }
}