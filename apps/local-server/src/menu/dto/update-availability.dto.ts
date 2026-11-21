import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateAvailabilityDto {
  @ApiProperty({ example: false, description: 'false — "Tugadi" (sotuvdan olingan), true — mavjud' })
  @IsBoolean({ message: 'isAvailable true yoki false bo\'lishi kerak' })
  isAvailable: boolean;
}
