import { StageKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateStageDto {
  @IsString()
  @Length(2, 40, { message: 'O nome do estágio precisa ter entre 2 e 40 caracteres.' })
  name!: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'A cor precisa estar no formato #RRGGBB.' })
  color?: string;

  @IsOptional()
  @IsEnum(StageKind, { message: 'Tipo inválido. Use OPEN, WON ou LOST.' })
  kind?: StageKind;
}