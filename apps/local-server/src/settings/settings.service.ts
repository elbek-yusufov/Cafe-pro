import { BadRequestException, Injectable } from '@nestjs/common';
import { generateUUIDv7, SyncOperation } from '@oshxona/shared';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';

type Validator = (v: string) => string | null; // null = to'g'ri, aks holda xato matni

const text = (max: number): Validator => (v) => (v.length <= max ? null : `${max} belgidan oshmasligi kerak`);
const intRange = (min: number, max: number): Validator => (v) =>
  /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max ? null : `${min}–${max} oralig'idagi butun son bo'lishi kerak`;
const oneOf = (...vals: string[]): Validator => (v) => (vals.includes(v) ? null : `Faqat: ${vals.join(', ')}`);
const timezone: Validator = (v) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: v });
    return null;
  } catch {
    return 'Noto\'g\'ri vaqt mintaqasi (masalan: Asia/Tashkent)';
  }
};

/**
 * Ruxsat etilgan sozlamalar va ularning tekshiruvi. Ro'yxatda yo'q kalit saqlanmaydi.
 * Bu yerda maxfiy qiymat (kalit, parol, token) YO'Q — ular faqat .env da.
 */
export const SETTINGS_SCHEMA: Record<string, { label: string; validate: Validator; default: string }> = {
  RESTAURANT_NAME: { label: 'Restoran nomi', validate: text(80), default: 'Restoran' },
  RESTAURANT_ADDRESS: { label: 'Manzil', validate: text(160), default: '' },
  RESTAURANT_PHONE: { label: 'Telefon', validate: text(40), default: '' },
  RESTAURANT_TIN: { label: 'STIR (INN)', validate: (v) => (/^\d{0,14}$/.test(v) ? null : 'Faqat raqam, 14 tagacha'), default: '' },
  CURRENCY: { label: 'Valyuta', validate: oneOf('UZS'), default: 'UZS' },
  TIMEZONE: { label: 'Vaqt mintaqasi', validate: timezone, default: 'Asia/Tashkent' },
  SERVICE_FEE_PERCENT: { label: 'Xizmat haqi (%) — faqat zal', validate: intRange(0, 30), default: '10' },
  RECEIPT_HEADER_NOTE: { label: 'Chek sarlavhasi', validate: text(200), default: '' },
  RECEIPT_FOOTER_NOTE: { label: 'Chek osti yozuvi', validate: text(200), default: 'Xaridingiz uchun rahmat!' },
  RECEIPT_PAPER_WIDTH: { label: 'Chek qog\'ozi (mm)', validate: oneOf('58', '80'), default: '80' },
  STOCK_ALLOW_NEGATIVE: { label: 'Ombor manfiy qoldiqqa ruxsat', validate: oneOf('true', 'false'), default: 'true' },
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventsGateway,
  ) {}

  /** Barcha ruxsat etilgan sozlamalar (yo'q bo'lsa default bilan) */
  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: Object.keys(SETTINGS_SCHEMA) }, deletedAt: null },
    });
    const map = Object.fromEntries(Object.entries(SETTINGS_SCHEMA).map(([k, d]) => [k, d.default]));
    for (const r of rows) map[r.key] = r.value;
    return map;
  }

  describe() {
    return Object.entries(SETTINGS_SCHEMA).map(([key, d]) => ({ key, label: d.label, default: d.default }));
  }

  async update(changes: Record<string, unknown>, actor: Actor) {
    const errors: string[] = [];
    const clean: Record<string, string> = {};
    for (const [key, raw] of Object.entries(changes)) {
      const def = SETTINGS_SCHEMA[key];
      if (!def) {
        errors.push(`${key}: noma'lum sozlama`);
        continue;
      }
      const value = typeof raw === 'boolean' || typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : null;
      if (value === null) {
        errors.push(`${key}: matn bo'lishi kerak`);
        continue;
      }
      const err = def.validate(value);
      if (err) errors.push(`${def.label}: ${err}`);
      else clean[key] = value;
    }
    if (errors.length) throw new BadRequestException(errors);
    if (!Object.keys(clean).length) throw new BadRequestException('O\'zgartirish yo\'q');

    const before = await this.getAll();
    await this.prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(clean)) {
        const row = await tx.setting.upsert({
          where: { key },
          create: { id: generateUUIDv7(), key, value, description: SETTINGS_SCHEMA[key].label, deviceId: actor.deviceId },
          update: { value, deletedAt: null, version: { increment: 1 }, deviceId: actor.deviceId },
        });
        await tx.syncQueue.create({
          data: {
            id: generateUUIDv7(),
            entity: 'setting',
            entityId: row.id,
            operation: SyncOperation.UPDATE,
            payload: { key, value },
            deviceId: actor.deviceId,
          },
        });
      }
      await this.audit.log(
        actor,
        'SETTINGS_UPDATE',
        { changes: Object.fromEntries(Object.entries(clean).map(([k, v]) => [k, { from: before[k], to: v }])) },
        tx,
      );
    });

    const after = await this.getAll();
    this.events.emitToRoles(['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER'], 'settings:updated', { keys: Object.keys(clean) });
    return after;
  }
}
