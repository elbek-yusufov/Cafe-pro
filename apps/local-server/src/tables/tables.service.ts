import { Injectable, NotFoundException } from '@nestjs/common';
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

  async deleteTable(id: string, deviceId?: string) {
    await this.getTableById(id);

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
}
