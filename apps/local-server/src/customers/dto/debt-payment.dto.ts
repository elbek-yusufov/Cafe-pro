import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '@oshxona/db';

export class DebtPaymentDto {
  @ApiProperty({ example: 50000, description: 'Qarzni yopish uchun to\'lanayotgan summa' })
  @IsInt()
  @Min(100)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: 'Qisman qarz to\'landi', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
