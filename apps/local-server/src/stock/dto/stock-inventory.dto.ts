import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InventoryItemDto {
  @ApiProperty({ description: 'Xomashyo IDsi' })
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @ApiProperty({ example: 48.5, description: 'Omborda haqiqiy sanalgan miqdor' })
  @IsNumber()
  @Min(0)
  actualQty: number;
}

export class StockInventoryDto {
  @ApiProperty({ type: [InventoryItemDto], description: 'Sanalgan xomashyolar ro\'yxati' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  items: InventoryItemDto[];

  @ApiProperty({ example: 'Haftalik yakuniy inventarizatsiya', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
