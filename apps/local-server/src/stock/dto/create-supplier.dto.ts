import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Siyob Ulgurji Bazasi', description: 'Yetkazib beruvchi nomi' })
  @IsString()
  @IsNotEmpty({ message: 'Nomi kiritilishi shart' })
  name: string;

  @ApiProperty({ example: '+998901234567', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Samarqand sh., Dahbed ko\'chasi', required: false })
  @IsOptional()
  @IsString()
  address?: string;
}
