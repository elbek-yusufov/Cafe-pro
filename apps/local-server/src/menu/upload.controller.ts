import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@oshxona/db';

@ApiTags('Menyu — Rasm Yuklash')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('menu/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Bitta taom rasmini yuklash (Base64 JPEG/PNG/WebP, max 5MB)' })
  async uploadSingle(@Body() body: { image: string; filename?: string }) {
    if (!body.image) {
      throw new BadRequestException('Rasm ma\'lumoti (image) kiritilishi shart');
    }
    return this.uploadService.saveBase64Image(body.image, body.filename);
  }

  @Post('images')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Bir nechta taom rasmlarini yuklash' })
  async uploadMultiple(@Body() body: { images: string[] }) {
    if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
      throw new BadRequestException('Kamida bitta rasm yuborilishi shart');
    }

    const results = [];
    for (const img of body.images) {
      const res = await this.uploadService.saveBase64Image(img);
      results.push(res);
    }

    return results;
  }
}
