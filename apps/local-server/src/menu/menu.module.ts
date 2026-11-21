import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { MenuItemsService } from './menu-items.service';
import { MenuItemsController } from './menu-items.controller';
import { ModifiersService } from './modifiers.service';
import { ModifiersController } from './modifiers.controller';
import { GuestController } from './guest.controller';

import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';

@Module({
  imports: [EventsModule],
  controllers: [
    CategoriesController,
    MenuItemsController,
    ModifiersController,
    GuestController,
    UploadController,
  ],
  providers: [
    CategoriesService,
    MenuItemsService,
    ModifiersService,
    UploadService,
  ],
  exports: [
    CategoriesService,
    MenuItemsService,
    ModifiersService,
    UploadService,
  ],
})
export class MenuModule {}
