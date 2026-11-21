import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({ example: '0000', description: 'Tasdiqlovchi Admin PIN kodi' })
  @IsOptional()
  @IsString()
  @Length(4, 6)
  @Matches(/^[0-9]+$/, { message: 'PIN faqat raqamlardan iborat bo\'lishi kerak' })
  adminPin?: string;

  @ApiProperty({ example: 'Mijoz kutishni istamadi va ketdi', description: 'Bekor qilish sababi' })
  @IsString()
  @IsNotEmpty({ message: 'Bekor qilish sababi kiritilishi shart' })
  @MaxLength(300)
  reason: string;
}
