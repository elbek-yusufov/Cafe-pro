import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateModifierDto {
  @ApiProperty({ description: 'Modifier guruh IDsi' })
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @ApiProperty({ example: '+ Qazi', description: 'Qo\'shimcha nomi' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 10000, required: false, default: 0, description: 'Narxi (0 bo\'lsa bepul)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiProperty({ example: 6000, required: false, default: 0, description: 'Tannarx' })
  @IsOptional()
  @IsInt()
  @Min(0)
  costPrice?: number;
}
