import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsInt, Matches, MaxLength, Min, Max } from 'class-validator';
import { MENU_IMAGE_URL_PATTERN } from './create-menu-item.dto';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Birinchi taomlar', description: 'Kategoriya nomi (O\'zbekcha)' })
  @MaxLength(80, { message: 'Kategoriya nomi 80 belgidan oshmasligi kerak' })
  @IsString({ message: 'Nomi matn bo\'lishi kerak' })
  @IsNotEmpty({ message: 'Kategoriya nomi kiritilishi shart' })
  name: string;

  @ApiProperty({ required: false, example: 'Первые блюда' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nameRu?: string;

  @ApiProperty({ required: false, example: '#EA580C' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Rang #RRGGBB formatida bo\'lishi kerak' })
  color?: string;

  @ApiProperty({ required: false, example: '🍲', description: 'Emoji yoki qisqa belgi' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  icon?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(MENU_IMAGE_URL_PATTERN, { message: 'Rasm faqat /uploads/menu-image orqali yuklanishi kerak' })
  imageUrl?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}
