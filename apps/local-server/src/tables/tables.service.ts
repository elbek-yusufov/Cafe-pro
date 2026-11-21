import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { TableStatus } from '@oshxona/db';
import { generateUUIDv7, SyncOperation } from '@oshxona/shared';

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Barcha zallar va ularning stollari (ochiq buyurtma summasi va holati bilan)
   */
  async getHallsWithTables(branchId?: string) {
    return this.prisma.hall.findMany({
      where: {
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        tables: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
          include: {
            orders: {
              where: {
                deletedAt: null,
                status: { in: ['OPEN', 'SENT'] },
              },
              select: {
                id: true,
                orderNumber: true,
                type: true,
                status: true,
                guestCount: true,
                subtotal: true,
                total: true,
                createdAt: true,
                cashier: { select: { id: true, name: true } },
                waiter: { select: { id: true, name: true } },
                _count: { select: { items: { where: { deletedAt: null } } } },
              },
              take: 1,
            },
          },
        },
      },
    });
  }

  async getTableById(id: string) {
    const table = await this.prisma.table.findFirst({
      where: { id, deletedAt: null },
      include: {
        hall: true,
        orders: {
          where: {
            deletedAt: null,
            status: { in: ['OPEN', 'SENT'] },
          },
          include: {
            items: {
              where: { deletedAt: null },
              include: { menuItem: true },
            },
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException(`IDsi ${id} bo'lgan stol topilmadi`);
    }

    return table;
  }

  async createTable(dto: CreateTableDto, deviceId?: string) {
    const id = generateUUIDv7();

    const table = await this.prisma.table.create({
      data: {
        id,
        hallId: dto.hallId,
        name: dto.name,
        capacity: dto.capacity ?? 4,
        status: dto.status ?? TableStatus.AVAILABLE,
        posX: dto.posX ?? 0,
        posY: dto.posY ?? 0,
        deviceId,
      },
    });

    await this.prisma.syncQueue.create({
      data: {
        id: generateUUIDv7(),
        entity: 'table',
        entityId: id,
        operation: SyncOperation.CREATE,
        payload: table as any,
        deviceId,
      },
    });

    this.eventsGateway.emitTableStatus(table);
    return table;
  }

  async updateTable(id: string, dto: UpdateTableDto, deviceId?: string) {
    await this.getTableById(id);

    const updated = await this.prisma.table.update({
      where: { id },
      data: {
        ...dto,
        version: { increment: 1 },
        deviceId,
      },
    });

    await this.prisma.syncQueue.create({
      data: {
        id: generateUUIDv7(),
        entity: 'table',
        entityId: id,
        operation: SyncOperation.UPDATE,
        payload: updated as any,
        deviceId,
      },
    });

    this.eventsGateway.emitTableStatus(updated);
    return updated;
  }

  async updateStatus(id: string, status: TableStatus, deviceId?: string) {
    if (!Object.values(TableStatus).includes(status)) {
      throw new BadRequestException('Stol holati noto\'g\'ri');
    }
    // Ochiq buyurtmasi bor stolni qo'lda "bo'sh" qilib bo'lmaydi (holat buyurtmadan kelib chiqadi)
    if (status !== TableStatus.OCCUPIED && (await this.activeOrderOn(id))) {
      throw new ConflictException('Stolda ochiq buyurtma bor — holatni to\'lov yoki bekor qilish o\'zgartiradi');
    }
    const updated = await this.prisma.table.update({
      where: { id },
      data: {
        status,
        version: { increment: 1 },
        deviceId,
      },
    });

    await this.prisma.syncQueue.create({
      data: {
        id: generateUUIDv7(),
        entity: 'table',
        entityId: id,
        operation: SyncOperation.UPDATE,
        payload: { id, status },
        deviceId,
      },
    });

    this.eventsGateway.emitTableStatus(updated);
    return updated;
  }

  private async activeOrderOn(tableId: string) {
    return this.prisma.order.findFirst({
      where: { tableId, deletedAt: null, status: { in: ['OPEN', 'SENT'] } },
      select: { id: true, orderNumber: true },
    });
  }

  async deleteTable(id: string, deviceId?: string) {
    await this.getTableById(id);
    const active = await this.activeOrderOn(id);
    if (active) {
      throw new ConflictException(`Stolda ochiq buyurtma bor (#${active.orderNumber}) — avval yoping`);
    }

    await this.prisma.table.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deviceId,
      },
    });

    await this.prisma.syncQueue.create({
      data: {
        id: generateUUIDv7(),
        entity: 'table',
        entityId: id,
        operation: SyncOperation.DELETE,
        payload: { id },
        deviceId,
      },
    });

    return { success: true, message: 'Stol o\'chirildi' };
  }

  // ---------------------------------------------------------------- Zallar

  async createHall(name: string, sortOrder: number | undefined, deviceId?: string) {
    const clean = (name || '').trim();
    if (!clean || clean.length > 60) throw new BadRequestException('Zal nomi 1–60 belgi bo\'lishi kerak');
    const exists = await this.prisma.hall.findFirst({ where: { deletedAt: null, name: { equals: clean, mode: 'insensitive' } } });
    if (exists) throw new ConflictException('Bunday nomli zal bor');
    const branch = await this.prisma.branch.findFirst({ where: { deletedAt: null }, select: { id: true } });
    const hall = await this.prisma.hall.create({
      data: { id: generateUUIDv7(), name: clean, sortOrder: sortOrder ?? 0, branchId: branch?.id, deviceId },
    });
    await this.prisma.syncQueue.create({
      data: { id: generateUUIDv7(), entity: 'hall', entityId: hall.id, operation: SyncOperation.CREATE, payload: hall as any, deviceId },
    });
    this.eventsGateway.emitTableStatus({ hallId: hall.id, action: 'hall_created' });
    return hall;
  }

  async updateHall(id: string, dto: { name?: string; sortOrder?: number }, deviceId?: string) {
    const hall = await this.prisma.hall.findFirst({ where: { id, deletedAt: null } });
    if (!hall) throw new NotFoundException('Zal topilmadi');
    if (dto.name !== undefined && (!dto.name.trim() || dto.name.trim().length > 60)) {
      throw new BadRequestException('Zal nomi 1–60 belgi bo\'lishi kerak');
    }
    const updated = await this.prisma.hall.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        version: { increment: 1 },
        deviceId,
      },
    });
    this.eventsGateway.emitTableStatus({ hallId: id, action: 'hall_updated' });
    return updated;
  }
}
