import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderItemStatus } from '@oshxona/db';

export class UpdateItemStatusDto {
  @ApiProperty({ enum: OrderItemStatus })
  @IsEnum(OrderItemStatus, { message: 'Taom holati noto\'g\'ri' })
  status: OrderItemStatus;
}
