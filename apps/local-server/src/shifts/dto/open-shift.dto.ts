import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class OpenShiftDto {
  @ApiProperty({ example: 200000, description: 'Smena boshidagi naqd pul (kassa qoldig\'i)', default: 0 })
  @IsInt({ message: 'Boshlang\'ich naqd pul butun son bo\'lishi kerak' })
  @Min(0, { message: 'Boshlang\'ich naqd pul manfiy bo\'lishi mumkin emas' })
  startingCash: number;

  @ApiProperty({ example: 'kassa-pos-01', required: false, description: 'Qurilma IDsi' })
  @IsOptional()
  deviceId?: string;
}
