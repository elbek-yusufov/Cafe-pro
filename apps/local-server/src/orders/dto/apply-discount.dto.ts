import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';

export class ApplyDiscountDto {
  @ApiProperty({ example: 10, description: 'Chegirma foizi (0 — chegirmani olib tashlash)' })
  @IsInt()
  @Min(0)
  @Max(100)
  percent: number;

  @ApiProperty({ required: false, example: 'Doimiy mijoz' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @ApiProperty({ required: false, description: 'Kassir limitidan katta chegirma uchun admin PIN' })
  @IsOptional()
  @Matches(/^[0-9]+$/)
  @Length(4, 6)
  approverPin?: string;
}
