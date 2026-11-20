import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType } from '@oshxona/db';
import { AddOrderItemDto } from './add-order-item.dto';

export class CreateOrderDto {
  @ApiProperty({ enum: OrderType, default: OrderType.DINE_IN })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiProperty({ description: 'Stol IDsi (Zal buyurtmasi uchun)', required: false })
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiProperty({ description: 'Ofitsiant IDsi', required: false })
  @IsOptional()
  @IsString()
  waiterId?: string;

  @ApiProperty({ example: 4, required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;

  @ApiProperty({ example: 'Tezroq keltirilsin', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [AddOrderItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddOrderItemDto)
  items?: AddOrderItemDto[];
}
