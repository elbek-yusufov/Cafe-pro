import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeItemDto {
  @ApiProperty({ description: 'Xomashyo IDsi' })
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @ApiProperty({ example: 0.15, description: '1 porsiya uchun sarflanadigan miqdor' })
  @IsNumber()
  @Min(0.0001)
  quantity: number;
}

export class CreateRecipeDto {
  @ApiProperty({ description: 'Taom IDsi (MenuItem ID)' })
  @IsString()
  @IsNotEmpty({ message: 'Taom tanlanishi shart' })
  menuItemId: string;

  @ApiProperty({ example: '1 porsiya choyxona palovi uchun xomashyo sarfi', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [RecipeItemDto], description: 'Xomashyolar va ularning me\'yori' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items: RecipeItemDto[];
}
