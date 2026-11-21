import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { TelegramService } from '../telegram/telegram.service';

export interface CallGuestServiceDto {
  tableName: string;
  type: 'WAITER' | 'BILL';
  notes?: string;
}

@ApiTags('Mehmonlar uchun — QR Menyu & Xizmat chaqiruvi (Public)')
@Controller('guest')
export class GuestController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly telegramService: TelegramService,
  ) {}

  @Get('menu')
  @ApiOperation({ summary: 'Mijoz QR kodi orqali ko\'radigan ommaviy taomnoma ro\'yxati' })
  async getPublicMenu() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        menuItems: {
          where: { isAvailable: true, deletedAt: null },
          include: {
            variants: {
              where: { deletedAt: null },
            },
            modifierGroups: {
              where: { deletedAt: null },
              include: {
                modifiers: {
                  where: { deletedAt: null },
                },
              },
            },
          },
        },
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      nameRu: cat.nameRu,
      icon: cat.icon,
      color: cat.color,
      items: cat.menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        nameRu: item.nameRu,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
        unit: item.unit,
        variants: item.variants.map((v) => ({
          id: v.id,
          name: v.name,
          price: v.price,
        })),
        modifierGroups: item.modifierGroups.map((g) => ({
          id: g.id,
          name: g.name,
          isRequired: g.isRequired,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          modifiers: g.modifiers.map((m) => ({
            id: m.id,
            name: m.name,
            price: m.price,
          })),
        })),
      })),
    }));
  }

  @Post('call-service')
  @ApiOperation({ summary: 'Stoldan ofitsiantni chaqirish yoki hisobni so\'rash' })
  async callService(@Body() dto: CallGuestServiceDto) {
    const actionName = dto.type === 'BILL' ? 'Hisob so\'raldi' : 'Ofitsiant chaqirildi';

    // 1. Kassa va ofitsiantlar planshetiga real-vaqt bildirishnoma
    this.eventsGateway.emitGuestCall({
      tableName: dto.tableName,
      type: dto.type,
      notes: dto.notes,
      time: new Date().toISOString(),
    });

    // 2. Telegram orqali xodimlar guruhiga yuborish
    this.telegramService.sendCallStaffAlert(dto.tableName, dto.type).catch(() => {});

    return {
      success: true,
      message: `${dto.tableName} stoli uchun ${actionName}. Xodimlarimiz tez orada yetib kelishadi!`,
    };
  }
}
