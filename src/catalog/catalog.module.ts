import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaModule } from '../media/media.module';
import { Category, CategorySchema } from './schemas/category.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import {
  AdminCategoriesController,
  AdminProductsController,
  PublicCategoriesController,
  PublicProductsController,
} from './catalog.controller';
import { CategoryService, ProductService } from './catalog.service';
import { TranslationService } from './translation.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    MediaModule,
  ],
  controllers: [
    PublicCategoriesController,
    PublicProductsController,
    AdminCategoriesController,
    AdminProductsController,
  ],
  providers: [CategoryService, ProductService, TranslationService],
  exports: [CategoryService, ProductService, TranslationService, MongooseModule],
})
export class CatalogModule {}
