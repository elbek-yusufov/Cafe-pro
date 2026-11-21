import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Max,
  MaxLength,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@oshxona/db';

export class SinglePaymentDto {
  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: 92400, description: 'Ushbu usulda to\'lanayotgan summa' })
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  amount: number;

  @ApiProperty({ example: 100000, required: false, description: 'Naqd pulda mijoz bergan summa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  received?: number;

  @ApiProperty({ example: 'click-trans-9921', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  transactionId?: string;

  @ApiProperty({ description: 'Nasiya uchun doimiy mijoz IDsi', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerId?: string;

  @ApiProperty({ example: 'Ali Valiyev', required: false, description: 'Nasiya oluvchi ismi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerName?: string;

  @ApiProperty({ example: '+998901234567', required: false, description: 'Nasiya oluvchi telefoni' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerPhone?: string;
}

export class ProcessPaymentDto {
  @ApiProperty({ type: [SinglePaymentDto], description: 'To\'lovlar ro\'yxati (Aralash to\'lov qo\'llab-quvvatlanadi)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => SinglePaymentDto)
  payments: SinglePaymentDto[];

  @ApiProperty({ example: false, required: false, default: true, description: 'Avtomatik chek chop etish' })
  @IsOptional()
  printReceipt?: boolean;
}
