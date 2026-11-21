import { BadRequestException, Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { generateUUIDv7 } from '@oshxona/shared';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

/** Yuklangan fayllar papkasi (default: <local-server>/uploads). Gitignore qilingan. */
export function getUploadsRoot(): string {
  return path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));
}

export function getMenuImagesDir(): string {
  return path.join(getUploadsRoot(), 'menu');
}

type ImageKind = { ext: 'jpg' | 'png' | 'webp'; mime: string };

/**
 * Fayl turini kengaytma yoki Content-Type ga emas, haqiqiy baytlariga (magic bytes) qarab aniqlash.
 * SVG/HTML qasddan qabul qilinmaydi (XSS xavfi).
 */
export function detectImageKind(buf: Buffer): ImageKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

@Injectable()
export class UploadsService {
  async saveMenuImage(file: { buffer: Buffer; size: number } | undefined): Promise<{ url: string; sizeBytes: number; mime: string }> {
    if (!file || !file.buffer || file.size === 0) {
      throw new BadRequestException('Rasm fayli yuborilmadi (maydon nomi: "file")');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Rasm hajmi 2 MB dan oshmasligi kerak');
    }

    const kind = detectImageKind(file.buffer);
    if (!kind) {
      throw new BadRequestException('Faqat JPG, PNG yoki WEBP rasm qabul qilinadi');
    }

    const dir = getMenuImagesDir();
    await fs.mkdir(dir, { recursive: true });

    const filename = `${generateUUIDv7()}.${kind.ext}`;
    // 'wx' — mavjud faylni hech qachon ustidan yozmaydi
    await fs.writeFile(path.join(dir, filename), file.buffer, { flag: 'wx' });

    return { url: `/uploads/menu/${filename}`, sizeBytes: file.size, mime: kind.mime };
  }
}
