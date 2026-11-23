import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReorderRulesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids!: string[];
}