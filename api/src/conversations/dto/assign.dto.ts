import { IsOptional, IsString } from 'class-validator';

export class AssignDto {
  @IsOptional()
  @IsString()
  assignedToId!: string | null;
}