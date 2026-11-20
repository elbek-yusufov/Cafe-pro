import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateVariantDto {
  @ApiProperty({ example: '0.5 porsiya', description: 'Variant nomi (masalan: 0.5 porsiya, 1 kg)' })
  @IsString()
  @IsNotEmpty({ message: 'Variant nomi kiritilishi shart' })
  name: string;

  @ApiProperty({ example: 22000, description: 'Ushbu variant narxi (so\'m)' })
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty({ example: 12000, required: false, description: 'Tannarx (so\'m)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  costPrice?: number;
}
