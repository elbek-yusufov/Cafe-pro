import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ModifierSelectionDto {
  @ApiProperty()
  @IsString()
  modifierId: string;

  @ApiProperty({ example: '+ Qazi' })
  @IsString()
  name: string;

  @ApiProperty({ example: 10000 })
  @IsInt()
  price: number;
}

export class AddOrderItemDto {
  @ApiProperty({ description: 'Taom IDsi (MenuItem ID)' })
  @IsString()
  @IsNotEmpty()
  menuItemId: string;

  @ApiProperty({ description: 'Variant IDsi (masalan 0.5 porsiya)', required: false })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ example: 2, default: 1, description: 'Soni / miqdori' })
  @IsNumber()
  @Min(0.1)
  quantity: number;

  @ApiProperty({ example: 'Piyozsiz bo\'lsin', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [ModifierSelectionDto], required: false })
  @IsOptional()
  @IsArray()
  modifiers?: ModifierSelectionDto[];
}
