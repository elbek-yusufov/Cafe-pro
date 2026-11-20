import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { generateUUIDv7, SyncOperation } from '@oshxona/shared';

@Injectable()
export class ModifiersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateModifierDto, deviceId?: string) {
    const group = await this.prisma.modifierGroup.findUnique({
      where: { id: dto.groupId },
    });

    if (!group) {
      throw new NotFoundException('Modifier guruhi topilmadi');
    }

    const id = generateUUIDv7();

    return this.prisma.$transaction(async (tx) => {
      const modifier = await tx.modifier.create({
        data: {
          id,
          groupId: dto.groupId,
          name: dto.name,
          price: dto.price || 0,
          costPrice: dto.costPrice || 0,
          deviceId,
        },
      });

      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'modifier',
          entityId: id,
          operation: SyncOperation.CREATE,
          payload: modifier as any,
          deviceId,
        },
      });

      return modifier;
    });
  }

  async findAllByGroup(groupId: string) {
    return this.prisma.modifier.findMany({
      where: { groupId, deletedAt: null },
      orderBy: { price: 'asc' },
    });
  }

  async remove(id: string, deviceId?: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.modifier.update({
        where: { id },
        data: { deletedAt: new Date(), deviceId },
      });

      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'modifier',
          entityId: id,
          operation: SyncOperation.DELETE,
          payload: { id },
          deviceId,
        },
      });

      return { success: true, message: 'Modifier o\'chirildi' };
    });
  }
}
