import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SimularMensagemDto {
  @IsString()
  numeroEmpresa!: string;

  @IsString()
  telefoneCliente!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nomeContato?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  texto!: string;

  @IsOptional()
  @IsIn(['ENTRADA', 'SAIDA_APP'])
  direcao?: 'ENTRADA' | 'SAIDA_APP';
}