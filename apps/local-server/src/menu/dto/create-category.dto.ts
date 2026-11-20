import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsInt, IsBoolean } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Birinchi taomlar', description: 'Kategoriya nomi (O\'zbekcha)' })
  @IsString({ message: 'Nomi matn bo\'lishi kerak' })
  @IsNotEmpty({ message: 'Kategoriya nomi kiritilishi shart' })
  name: string;

  @ApiProperty({ example: 'Первые блюда', required: false, description: 'Kategoriya nomi (Ruscha)' })
  @IsOptional()
  @IsString()
  nameRu?: string;

  @ApiProperty({ example: '#EA580C', required: false, description: 'Kassa ekranidagi rang kodi' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: 'soup', required: false, description: 'Ikonka nomi' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ example: 'https://...', required: false, description: 'Rasm URL manzili' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 1, required: false, description: 'Saralash tartibi' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
