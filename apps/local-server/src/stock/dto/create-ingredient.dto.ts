import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { UnitType } from '@oshxona/db';

export class CreateIngredientDto {
  @ApiProperty({ example: 'Devzira guruch', description: 'Xomashyo nomi' })
  @IsString()
  @IsNotEmpty({ message: 'Xomashyo nomi kiritilishi shart' })
  name: string;

  @ApiProperty({ enum: UnitType, default: UnitType.KG, description: 'O\'lchov birligi' })
  @IsEnum(UnitType)
  unit: UnitType;

  @ApiProperty({ example: 20, default: 0, description: 'Minimal qoldiq (ogohlantirish uchun)' })
  @IsNumber()
  @Min(0)
  minQty: number;

  @ApiProperty({ example: 100, default: 0, description: 'Boshlang\'ich qoldiq miqdori' })
  @IsNumber()
  @Min(0)
  initialQty?: number;

  @ApiProperty({ example: 22000, default: 0, description: '1 birlik o\'rtacha tannarxi (so\'m)' })
  @IsNumber()
  @Min(0)
  avgCost?: number;
}
