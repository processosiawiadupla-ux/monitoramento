import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsString, Length, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(2, 100, { message: 'O nome precisa ter entre 2 e 100 caracteres.' })
  name!: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'A senha precisa ter pelo menos 8 caracteres.' })
  password!: string;

  @IsEnum(Role, { message: 'Papel inválido. Use ADMIN, GESTOR ou VENDEDOR.' })
  role!: Role;
}