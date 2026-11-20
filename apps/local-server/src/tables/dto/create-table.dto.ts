import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { TableStatus } from '@oshxona/db';

export class CreateTableDto {
  @ApiProperty({ example: 'Stol 1', description: 'Stol nomi yoki raqami' })
  @IsString()
  @IsNotEmpty({ message: 'Stol nomi kiritilishi shart' })
  name: string;

  @ApiProperty({ description: 'Zal IDsi (Hall)' })
  @IsString()
  @IsNotEmpty({ message: 'Zal tanlanishi shart' })
  hallId: string;

  @ApiProperty({ example: 4, required: false, default: 4, description: 'Sig\'imi (kishilik)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiProperty({ enum: TableStatus, default: TableStatus.AVAILABLE, required: false })
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;

  @ApiProperty({ example: 1, required: false, default: 0, description: 'Stollar xaritasidagi X koordinatasi' })
  @IsOptional()
  @IsInt()
  posX?: number;

  @ApiProperty({ example: 1, required: false, default: 0, description: 'Stollar xaritasidagi Y koordinatasi' })
  @IsOptional()
  @IsInt()
  posY?: number;
}
