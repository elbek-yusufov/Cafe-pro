import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePriceDto {
  @ApiProperty({ example: 40000, description: 'Yangi sotuv narxi (so\'m)' })
  @IsInt({ message: 'Narx butun son bo\'lishi kerak' })
  @Min(0, { message: 'Narx 0 dan kam bo\'lishi mumkin emas' })
  newPrice: number;

  @ApiProperty({ example: 24000, required: false, description: 'Yangi tannarx (so\'m)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  newCostPrice?: number;

  @ApiProperty({ example: 'Go\'sht narxi qimmatlashdi', required: false, description: 'Narx o\'zgarish sababi' })
  @IsOptional()
  @IsString()
  reason?: string;
}
