import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from '../catalog/schemas/category.schema';
import { Product, ProductSchema } from '../catalog/schemas/product.schema';
import { MediaAsset, MediaAssetSchema } from './schemas/media-asset.schema';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: MediaAsset.name, schema: MediaAssetSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService, MongooseModule],
})
export class MediaModule {}
