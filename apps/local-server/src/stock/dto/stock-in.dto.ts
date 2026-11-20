import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class StockInDto {
  @ApiProperty({ description: 'Xomashyo IDsi' })
  @IsString()
  @IsNotEmpty({ message: 'Xomashyo tanlanishi shart' })
  ingredientId: string;

  @ApiProperty({ example: 50, description: 'Kirim qilinayotgan miqdor (kg, l, dona)' })
  @IsNumber()
  @Min(0.001, { message: 'Miqdor 0 dan katta bo\'lishi kerak' })
  quantity: number;

  @ApiProperty({ example: 24000, description: '1 birlik xarid narxi (so\'m)' })
  @IsInt()
  @Min(0)
  unitCost: number;

  @ApiProperty({ description: 'Yetkazib beruvchi IDsi', required: false })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({ example: 'Siyob bozoridan olingan yangi partiya', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
