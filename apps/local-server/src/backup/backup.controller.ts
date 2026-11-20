import { Controller, Get, Post, Param, Res, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@oshxona/db';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('Tizim — Zaxira nusxalari (Backups)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('backups')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('create')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ma\'lumotlar bazasining zaxira nusxasini (Backup) yaratish' })
  async createBackup() {
    return this.backupService.createBackup();
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Mavjud barcha zaxira nusxalar ro\'yxati' })
  async getBackups() {
    return this.backupService.listBackups();
  }

  @Get('download/:filename')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Zaxira nusxa faylini yuklab olish' })
  async downloadBackup(@Param('filename') filename: string, @Res() res: Response) {
    const safeName = path.basename(filename);
    const filePath = path.resolve(process.cwd(), 'backups', safeName);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Zaxira fayli topilmadi');
    }

    return res.download(filePath, safeName);
  }
}
