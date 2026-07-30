import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { CLOUDINARY_PUBLIC_ID_REGEX } from '../../common/dto/shared.dto';
import { baseSchemaOptions } from '../../common/schemas/schema-options';
import {
  localizedTextSchema,
  nullableLocalizedTextSchema,
} from '../../common/schemas/shared.schema';

export type MediaAssetDocument = HydratedDocument<MediaAsset>;

export enum MediaFolder {
  PRODUCTS = 'el-trigal/products',
  CATEGORIES = 'el-trigal/categories',
  CUSTOM_CAKES = 'el-trigal/custom-cakes',
  GALLERY = 'el-trigal/gallery',
  BUSINESS = 'el-trigal/business',
  TEMPORARY = 'el-trigal/temporary',
}

@Schema(baseSchemaOptions)
export class MediaAsset {
  @Prop({ type: String, required: true, unique: true, match: CLOUDINARY_PUBLIC_ID_REGEX })
  publicId: string;

  @Prop({ type: String, required: true, match: /^https:\/\// })
  secureUrl: string;

  @Prop({ type: String, enum: ['image', 'video'], required: true })
  resourceType: 'image' | 'video';

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  format: string;

  @Prop({ type: Number, required: true, min: 1, max: 12000 })
  width: number;

  @Prop({ type: Number, required: true, min: 1, max: 12000 })
  height: number;

  @Prop({ type: Number, required: true, min: 1 })
  bytes: number;

  @Prop({ type: localizedTextSchema, required: true })
  alt: { es: string; en: string };

  @Prop({ type: nullableLocalizedTextSchema, default: null })
  caption: { es: string; en: string } | null;

  @Prop({ type: Boolean, default: false, required: true })
  isPrimary: boolean;

  @Prop({ type: Number, min: 0, max: 10000, default: 0 })
  sortOrder: number;

  @Prop({ type: String, enum: Object.values(MediaFolder), required: true })
  folder: MediaFolder;

  @Prop({ type: Boolean, default: false, required: true })
  confirmed: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  temporaryExpiresAt: Date | null;
}

export const MediaAssetSchema = SchemaFactory.createForClass(MediaAsset);
MediaAssetSchema.index({ publicId: 1 }, { unique: true, name: 'media_public_id_unique' });
MediaAssetSchema.index(
  { temporaryExpiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { temporaryExpiresAt: { $type: 'date' } },
    name: 'media_temporary_ttl',
  },
);
MediaAssetSchema.index(
  { folder: 1, confirmed: 1, sortOrder: 1 },
  { name: 'media_folder_confirmed' },
);
