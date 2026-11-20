import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class StockWasteDto {
  @ApiProperty({ description: 'Xomashyo IDsi' })
  @IsString()
  @IsNotEmpty({ message: 'Xomashyo tanlanishi shart' })
  ingredientId: string;

  @ApiProperty({ example: 2.5, description: 'Chiqitga chiqarilayotgan miqdor' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty({ example: 'Saqlash jarayonida aynigan sabzi', description: 'Chiqitga chiqarish sababi (majburiy)' })
  @IsString()
  @IsNotEmpty({ message: 'Isrof / chiqit sababi kiritilishi shart' })
  reason: string;
}
