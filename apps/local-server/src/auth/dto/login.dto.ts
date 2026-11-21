import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Foydalanuvchi logini' })
  @IsString({ message: 'Login qatordan iborat bo\'lishi shart' })
  @IsNotEmpty({ message: 'Login kiritilishi shart' })
  username: string;

  @ApiProperty({ example: 'admin123', description: 'Foydalanuvchi paroli' })
  @IsString({ message: 'Parol qatordan iborat bo\'lishi shart' })
  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @MinLength(6, { message: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' })
  password: string;

  @ApiProperty({ example: 'kassa-pos-01', required: false, description: 'Kirilayotgan kassa qurilmasi IDsi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceId?: string;
}
