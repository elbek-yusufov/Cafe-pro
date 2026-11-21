import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { generateUUIDv7 } from '@oshxona/shared';

@Injectable()
export class UploadService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'products');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Base64 yoki Fayl orqali yuklangan taom rasmini saqlash
   */
  async saveBase64Image(dataUri: string, originalName?: string): Promise<{ url: string; filename: string }> {
    // 1. Data URI formatini tekshirish: data:image/png;base64,....
    const matches = dataUri.match(/^data:(image\/(jpeg|jpg|png|webp));base64,(.+)$/);
    if (!matches) {
      throw new BadRequestException(
        'Rasm formati noto\'g\'ri! Faqat JPEG, PNG va WebP formatlari qabul qilinadi.',
      );
    }

    const mimeType = matches[1];
    const base64Data = matches[3];
    const buffer = Buffer.from(base64Data, 'base64');

    // 2. Hajmni tekshirish (maksimal 5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      throw new BadRequestException('Rasm hajmi 5 MB dan oshmasligi kerak!');
    }

    // 3. Kengaytmani aniqlash
    let ext = 'jpg';
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';

    const filename = `dish-${generateUUIDv7()}.${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    return {
      url: `/uploads/products/${filename}`,
      filename,
    };
  }

  /**
   * Rasmni o'chirish
   */
  async deleteImage(relativePath: string): Promise<boolean> {
    try {
      const filename = path.basename(relativePath);
      const filePath = path.join(this.uploadDir, filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
    } catch {
      // fayl topilmasa e'tiborsiz qoldirish
    }
    return false;
  }
}
