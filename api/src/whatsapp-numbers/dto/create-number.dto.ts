import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateNumberDto {
  @IsString()
  @Matches(/^[\d\s()+-]{10,20}$/, { message: 'Telefone inválido.' })
  phone!: string;

  @IsString()
  @MinLength(2, { message: 'Dê um nome ao número (ex.: Comercial · Ana).' })
  @MaxLength(60)
  label!: string;

  
  @IsOptional()
  @IsString()
  ownerId?: string | null;
}