import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { MenuItemsService } from './menu-items.service';
import { MenuItemsController } from './menu-items.controller';
import { ModifiersService } from './modifiers.service';
import { ModifiersController } from './modifiers.controller';
import { GuestController } from './guest.controller';

@Module({
  controllers: [
    CategoriesController,
    MenuItemsController,
    ModifiersController,
    GuestController,
  ],
  providers: [
    CategoriesService,
    MenuItemsService,
    ModifiersService,
  ],
  exports: [
    CategoriesService,
    MenuItemsService,
    ModifiersService,
  ],
})
export class MenuModule {}
