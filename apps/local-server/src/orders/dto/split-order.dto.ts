import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SplitItemDto {
  @ApiProperty({ description: 'Bo\'linadigan orderItem IDsi' })
  @IsString()
  @IsNotEmpty()
  orderItemId: string;

  @ApiProperty({ example: 1, description: 'Yangi hisobga o\'tkaziladigan miqdor' })
  @IsNumber()
  @Min(0.1)
  quantity: number;
}

export class SplitOrderDto {
  @ApiProperty({ type: [SplitItemDto], description: 'Yangi buyurtmaga ajratiladigan taomlar' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitItemDto)
  items: SplitItemDto[];
}
