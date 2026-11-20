import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MoveTableDto {
  @ApiProperty({ description: 'Ko\'chiriladigan yangi stol IDsi' })
  @IsString()
  @IsNotEmpty({ message: 'Yangi stol tanlanishi shart' })
  newTableId: string;
}
