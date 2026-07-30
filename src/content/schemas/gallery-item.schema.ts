import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Status } from '../../common/dto/shared.dto';
import { baseSchemaOptions } from '../../common/schemas/schema-options';
import {
  localizedTextSchema,
  mediaAssetEmbeddedSchema,
  nullableLocalizedTextSchema,
} from '../../common/schemas/shared.schema';

export type GalleryItemDocument = HydratedDocument<GalleryItem>;

@Schema(baseSchemaOptions)
export class GalleryItem {
  @Prop({ type: localizedTextSchema, required: true })
  title: { es: string; en: string };

  @Prop({ type: nullableLocalizedTextSchema, default: null })
  description: { es: string; en: string } | null;

  @Prop({ type: mediaAssetEmbeddedSchema, required: true })
  media: Record<string, unknown>;

  @Prop({ type: Boolean, default: false })
  featured: boolean;

  @Prop({ type: String, enum: Object.values(Status), default: Status.DRAFT })
  status: Status;

  @Prop({ type: Number, min: 0, max: 100000, default: 0 })
  sortOrder: number;
}

export const GalleryItemSchema = SchemaFactory.createForClass(GalleryItem);
GalleryItemSchema.index({ status: 1, featured: 1, sortOrder: 1 }, { name: 'gallery_status_sort' });
