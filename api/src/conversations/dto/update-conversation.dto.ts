import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateConversationDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor precisa ser um número com até 2 casas decimais.' })
  @Min(0, { message: 'O valor não pode ser negativo.' })
  estimatedValue?: number | null;
}
