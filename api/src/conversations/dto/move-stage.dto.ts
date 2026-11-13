import { IsNotEmpty, IsString } from 'class-validator';

export class MoveStageDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o estágio de destino.' })
  stageId!: string;
}