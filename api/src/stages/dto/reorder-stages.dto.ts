import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

// Lista com os ids de TODOS os estágios ativos, na nova ordem
export class ReorderStagesDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Envie a lista de estágios na nova ordem.' })
  @IsString({ each: true })
  ids!: string[];
}