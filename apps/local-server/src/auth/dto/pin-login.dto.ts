import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

/**
 * Kassa PIN orqali kirish.
 *
 * Ish jarayoni: kassir avval ekrandagi xodimlar ro'yxatidan (GET /auth/staff) o'zini tanlaydi,
 * so'ng shaxsiy PIN kodini kiritadi. Shu sababli `userIdentifier` majburiy — faqat PIN bilan
 * kirish (barcha foydalanuvchilar hashlarini ketma-ket tekshirish) xavfsiz emas.
 */
export class PinLoginDto {
  @ApiProperty({ example: 'kassir1', description: 'Tanlangan xodimning IDsi yoki logini' })
  @MaxLength(100, { message: 'Foydalanuvchi identifikatori juda uzun' })
  @IsString({ message: 'Foydalanuvchi identifikatori bo\'lishi shart' })
  @IsNotEmpty({ message: 'Avval xodimni tanlang' })
  userIdentifier: string;

  @ApiProperty({ example: '1111', description: '4–6 xonali maxfiy PIN kod' })
  @Matches(/^[0-9]+$/, { message: 'PIN kod faqat raqamlardan iborat bo\'lishi kerak' })
  @Length(4, 6, { message: 'PIN kod 4–6 xonali raqam bo\'lishi shart' })
  @IsString({ message: 'PIN kod matn bo\'lishi shart' })
  @IsNotEmpty({ message: 'PIN kod kiritilishi shart' })
  pin: string;

  @ApiProperty({ example: 'kassa-pos-01', required: false, description: 'Kirilayotgan kassa qurilmasi IDsi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceId?: string;
}
