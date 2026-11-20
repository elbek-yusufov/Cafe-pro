import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class PinLoginDto {
  @ApiProperty({ example: 'kassir1', description: 'Kassir foydalanuvchi logini yoki IDsi' })
  @IsString({ message: 'Foydalanuvchi identifikatori bo\'lishi shart' })
  @IsNotEmpty({ message: 'Foydalanuvchi tanlanishi shart' })
  userIdentifier: string; // username or userId

  @ApiProperty({ example: '1111', description: '4 xonali maxfiy PIN kod' })
  @IsString({ message: 'PIN kod matn bo\'lishi shart' })
  @IsNotEmpty({ message: 'PIN kod kiritilishi shart' })
  @Length(4, 6, { message: 'PIN kod 4 yoki 6 xonali raqam bo\'lishi shart' })
  @Matches(/^[0-9]+$/, { message: 'PIN kod faqat raqamlardan iborat bo\'lishi kerak' })
  pin: string;

  @ApiProperty({ example: 'kassa-pos-01', required: false, description: 'Kirilayotgan kassa qurilmasi IDsi' })
  deviceId?: string;
}
