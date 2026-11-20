import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { UnitType } from '@oshxona/db';

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Choyxona palov (Osh)', description: 'Taom nomi (O\'zbekcha)' })
  @IsString({ message: 'Taom nomi matn bo\'lishi shart' })
  @IsNotEmpty({ message: 'Taom nomi kiritilishi shart' })
  name: string;

  @ApiProperty({ example: 'Чайханский плов', required: false, description: 'Taom nomi (Ruscha)' })
  @IsOptional()
  @IsString()
  nameRu?: string;

  @ApiProperty({ example: 'Devzira guruch va mol go\'shti bilan tayyorlangan', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'https://...', required: false, description: 'Rasm URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 35000, description: 'Sotuv narxi (so\'m)' })
  @IsInt({ message: 'Narx butun son bo\'lishi kerak' })
  @Min(0, { message: 'Narx 0 dan kam bo\'lishi mumkin emas' })
  price: number;

  @ApiProperty({ example: 20000, required: false, description: 'Tannarx (so\'m)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  costPrice?: number;

  @ApiProperty({ enum: UnitType, default: UnitType.PORTION, description: 'O\'lchov birligi' })
  @IsEnum(UnitType, { message: 'O\'lchov birligi noto\'g\'ri' })
  unit: UnitType;

  @ApiProperty({ description: 'Kategoriya IDsi' })
  @IsString()
  @IsNotEmpty({ message: 'Kategoriya tanlanishi shart' })
  categoryId: string;

  @ApiProperty({ example: 'Issiq sex', required: false, description: 'Oshxona bo\'limi / stansiya nomi' })
  @IsOptional()
  @IsString()
  kitchenStationId?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({ example: false, required: false, default: false, description: 'Sevimli taom (Bosh ekranda ko\'rsatish)' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
