import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { CashMovementType } from '@oshxona/db';

export class CreateCashMovementDto {
  @ApiProperty({ enum: CashMovementType, description: 'Harakat turi (DEPOSIT: kirim, WITHDRAWAL: inkassatsiya, EXPENSE: xarajat)' })
  @IsEnum(CashMovementType)
  type: CashMovementType;

  @ApiProperty({ example: 100000, description: 'Summa (so\'m)' })
  @IsInt({ message: 'Summa butun son bo\'lishi shart' })
  @Min(100)
  amount: number;

  @ApiProperty({ example: 'Bozordan bir martalik idishlar sotib olindi', description: 'Pul harakatining aniq sababi' })
  @IsString()
  @IsNotEmpty({ message: 'Pul olish yoki kiritish sababi kiritilishi shart' })
  reason: string;
}
