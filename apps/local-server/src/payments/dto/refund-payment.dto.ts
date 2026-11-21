import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class RefundPaymentDto {
  @ApiProperty({ example: '0000', description: 'Admin PIN kodi' })
  @IsOptional()
  @IsString()
  @Length(4, 6)
  @Matches(/^[0-9]+$/, { message: 'PIN faqat raqamlardan iborat bo\'lishi kerak' })
  adminPin?: string;

  @ApiProperty({ example: 'Mijoz noto\'g\'ri taom berilgani sababli rad etdi', description: 'Qaytarish sababi' })
  @IsString()
  @IsNotEmpty({ message: 'Qaytarish sababi kiritilishi shart' })
  reason: string;
}
