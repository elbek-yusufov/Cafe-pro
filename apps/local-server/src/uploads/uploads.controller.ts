import { Controller, HttpCode, HttpStatus, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@oshxona/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Actor, AuditService } from '../audit/audit.service';
import { MAX_IMAGE_BYTES, UploadsService } from './uploads.service';

@ApiTags('Fayl yuklash')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly audit: AuditService,
  ) {}

  @Post('menu-image')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Taom/kategoriya rasmini yuklash (JPG/PNG/WEBP, ≤ 2 MB, faqat Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      // storage berilmagan — multer default MemoryStorage (diskka faqat tekshiruvdan keyin yoziladi)
      // Chegaradan katta fayl multer tomonidan 413 bilan rad etiladi
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 },
    }),
  )
  async uploadMenuImage(@UploadedFile() file: { buffer: Buffer; size: number } | undefined, @CurrentUser() user: Actor) {
    const result = await this.uploads.saveMenuImage(file);
    await this.audit.log(user, 'UPLOAD_MENU_IMAGE', { url: result.url, sizeBytes: result.sizeBytes, mime: result.mime });
    return result;
  }
}
