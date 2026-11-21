import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { UnitType } from '@oshxona/db';

/** Faqat lokal serverga yuklangan rasm (POST /uploads/menu-image) yoki bo'sh qiymat (rasmni olib tashlash). */
export const MENU_IMAGE_URL_PATTERN = /^(\/uploads\/menu\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp))?$/;
export const MAX_PRICE = 100_000_000;

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Choyxona palov (Osh)', description: 'Taom nomi' })
  @MaxLength(120, { message: 'Taom nomi 120 belgidan oshmasligi kerak' })
  @IsString({ message: 'Taom nomi matn bo\'lishi shart' })
  @IsNotEmpty({ message: 'Taom nomi kiritilishi shart' })
  name: string;

  @ApiProperty({ required: false, example: 'Чайханский плов' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nameRu?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ required: false, example: '/uploads/menu/0193….webp', description: 'POST /uploads/menu-image natijasi' })
  @IsOptional()
  @IsString()
  @Matches(MENU_IMAGE_URL_PATTERN, { message: 'Rasm faqat /uploads/menu-image orqali yuklanishi kerak' })
  imageUrl?: string;

  @ApiProperty({ example: 35000, description: 'Sotuv narxi (so\'m)' })
  @Max(MAX_PRICE, { message: 'Narx juda katta' })
  @Min(0, { message: 'Narx 0 dan kam bo\'lishi mumkin emas' })
  @IsInt({ message: 'Narx butun son bo\'lishi kerak' })
  price: number;

  @ApiProperty({ required: false, example: 20000, description: 'Tannarx (so\'m)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  costPrice?: number;

  @ApiProperty({ example: 30000, required: false, description: 'Chegirma narxi (so\'m)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountPrice?: number;

  @ApiProperty({ example: 'OSH-001', required: false, description: 'SKU / Mahsulot kodi' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: '4780012345678', required: false, description: 'Shtrix-kod' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 50, required: false, description: 'Ombordagi qoldiq miqdor' })
  @IsOptional()
  stockQty?: number;

  @ApiProperty({ example: 10, required: false, description: 'Minimal qoldiq' })
  @IsOptional()
  minStock?: number;

  @ApiProperty({ example: 15, required: false, description: 'Tayyorlanish vaqti (daqiqa)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  prepTime?: number;

  @ApiProperty({ example: ['https://...'], required: false, description: 'Qo\'shimcha rasmlar' })
  @IsOptional()
  images?: any;

  @ApiProperty({ enum: UnitType, example: UnitType.PORTION, default: UnitType.PORTION, description: 'O\'lchov birligi' })
  @IsEnum(UnitType, { message: 'O\'lchov birligi noto\'g\'ri' })
  unit: UnitType;

  @ApiProperty({ example: '0193…', description: 'Kategoriya IDsi' })
  @IsString()
  @IsNotEmpty({ message: 'Kategoriya tanlanishi shart' })
  categoryId: string;

  @ApiProperty({ required: false, example: 'Issiq sex' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  kitchenStationId?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ example: false, required: false, default: false, description: 'Ommabop / Xaridorgir taom belgisi' })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;
}
