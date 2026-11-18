import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateNumberDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  label?: string;

 
  @IsOptional()
  @IsString()
  ownerId?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}