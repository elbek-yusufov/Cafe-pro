import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CloseShiftDto {
  @ApiProperty({ example: 850000, description: 'Smena yopilishida kassada sanalgan haqiqiy naqd pul' })
  @IsInt({ message: 'Haqiqiy naqd pul butun son bo\'lishi shart' })
  @Min(0)
  actualCash: number;

  @ApiProperty({ example: 'Smena muvaffaqiyatli yakunlandi', required: false, description: 'Izoh' })
  @IsOptional()
  @IsString()
  notes?: string;
}
