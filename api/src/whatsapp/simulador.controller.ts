import { Body, Controller, HttpCode, NotFoundException, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { Roles } from '../auth/decorators';
import { EntradaService } from './entrada.service';
import { SimularMensagemDto } from './dto/simular-mensagem.dto';

/**
 * SIMULADOR: finge ser o WhatsApp, para testar sem a YCloud.
 * Só o ADMIN usa, e NUNCA funciona em produção.
 */
@Controller('dev')
export class SimuladorController {
  constructor(private readonly entrada: EntradaService) {}

  @Post('simular-mensagem')
  @Roles(Role.ADMIN)
  @HttpCode(200)
  simular(@Body() dto: SimularMensagemDto) {
    if (process.env.NODE_ENV === 'production') throw new NotFoundException();

    // Traduz o pedido do simulador para o formato padrão (é o "adaptador")
    return this.entrada.registrar({
      numeroEmpresa: dto.numeroEmpresa,
      telefoneCliente: dto.telefoneCliente,
      nomeContato: dto.nomeContato,
      texto: dto.texto,
      idExterno: `simulado-${randomUUID()}`,
      quando: new Date(),
      direcao: dto.direcao ?? 'ENTRADA',
    });
  }
}