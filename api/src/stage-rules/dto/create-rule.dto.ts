import { RuleTrigger } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRuleDto {
  @IsString()
  @MinLength(2, { message: 'Dê um nome para a regra.' })
  @MaxLength(60)
  name!: string;

  @IsEnum(RuleTrigger, { message: 'Tipo de regra inválido.' })
  trigger!: RuleTrigger;

  @IsString()
  toStageId!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  keywords?: string[];
}
