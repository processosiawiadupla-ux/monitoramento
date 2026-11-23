import { IsInt, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsInt({ message: 'Use um número inteiro de minutos.' })
  @Min(1, { message: 'O mínimo é 1 minuto.' })
  @Max(1440, { message: 'O máximo é 1440 minutos (24 horas).' })
  responseAlertMinutes!: number;
}