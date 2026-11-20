import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateModifierGroupDto {
  @ApiProperty({ example: 'Qo\'shimchalar', description: 'Guruh nomi' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 0, required: false, default: 0, description: 'Minimal tanlov soni' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSelect?: number;

  @ApiProperty({ example: 3, required: false, default: 1, description: 'Maksimal tanlov soni' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSelect?: number;

  @ApiProperty({ example: false, required: false, default: false, description: 'Majburiy tanlovmi?' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
