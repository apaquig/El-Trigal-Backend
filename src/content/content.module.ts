import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { Faq, FaqSchema } from './schemas/faq.schema';
import { GalleryItem, GalleryItemSchema } from './schemas/gallery-item.schema';
import { Testimonial, TestimonialSchema } from './schemas/testimonial.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Faq.name, schema: FaqSchema },
      { name: Testimonial.name, schema: TestimonialSchema },
      { name: GalleryItem.name, schema: GalleryItemSchema },
    ]),
  ],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
