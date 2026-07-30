import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Locale } from '../../common/dto/shared.dto';
import { baseSchemaOptions } from '../../common/schemas/schema-options';
import { mediaAssetEmbeddedSchema } from '../../common/schemas/shared.schema';

export enum CustomCakeRequestStatus {
  NEW = 'new',
  IN_REVIEW = 'in-review',
  QUOTED = 'quoted',
  WON = 'won',
  LOST = 'lost',
  ARCHIVED = 'archived',
}

export type CustomCakeRequestDocument = HydratedDocument<CustomCakeRequest>;

@Schema(baseSchemaOptions)
export class CustomCakeRequest {
  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  name: string;

  @Prop({ type: String, required: true, lowercase: true, trim: true, maxlength: 254 })
  email: string;

  @Prop({ type: String, required: true, trim: true })
  phone: string;

  @Prop({ type: Date, required: true })
  eventDate: Date;

  @Prop({
    type: String,
    enum: ['birthday', 'wedding', 'quinceanera', 'corporate', 'other'],
    required: true,
  })
  eventType: string;

  @Prop({ type: Number, min: 1, max: 500, required: true })
  servings: number;

  @Prop({ type: Number, min: 0, max: 1000000, default: null })
  budgetCents: number | null;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  flavor: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  filling: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  theme: string;

  @Prop({ type: String, default: null, trim: true, maxlength: 2000 })
  message: string | null;

  @Prop({ type: [mediaAssetEmbeddedSchema], default: [] })
  images: Record<string, unknown>[];

  @Prop({ type: String, enum: Object.values(Locale), required: true })
  locale: Locale;

  @Prop({
    type: String,
    enum: Object.values(CustomCakeRequestStatus),
    default: CustomCakeRequestStatus.NEW,
  })
  status: CustomCakeRequestStatus;

  @Prop({ type: String, trim: true, maxlength: 2000, default: null })
  internalNotes: string | null;
}

export const CustomCakeRequestSchema = SchemaFactory.createForClass(CustomCakeRequest);
CustomCakeRequestSchema.index({ status: 1, eventDate: 1 }, { name: 'cake_status_event_date' });
CustomCakeRequestSchema.index({ createdAt: -1 }, { name: 'cake_created_at' });
