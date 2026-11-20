import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MergeOrdersDto {
  @ApiProperty({ description: 'Asosiy saqlanib qoladigan buyurtma IDsi' })
  @IsString()
  @IsNotEmpty()
  targetOrderId: string;

  @ApiProperty({ description: 'Qo\'shilayotgan (va yopiladigan) ikkinchi buyurtma IDsi' })
  @IsString()
  @IsNotEmpty()
  sourceOrderId: string;
}
