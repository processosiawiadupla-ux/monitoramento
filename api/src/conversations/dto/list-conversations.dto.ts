// Filtros que vêm na URL, ex.: /api/conversations?search=mari&assignedToId=abc
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListConversationsDto {
  @IsOptional()
  @IsString()
  stageId?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string; // só vale para ADMIN e GESTOR

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string; // nome ou telefone do contato
}

