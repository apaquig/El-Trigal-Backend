import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Status } from '../../common/dto/shared.dto';
import { baseSchemaOptions } from '../../common/schemas/schema-options';
import { localizedTextSchema } from '../../common/schemas/shared.schema';

export type TestimonialDocument = HydratedDocument<Testimonial>;

@Schema(baseSchemaOptions)
export class Testimonial {
  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  name: string;

  @Prop({ type: localizedTextSchema, required: true })
  quote: { es: string; en: string };

  @Prop({ type: Number, min: 1, max: 5, default: 5 })
  rating: number;

  @Prop({ type: String, enum: Object.values(Status), default: Status.DRAFT })
  status: Status;

  @Prop({ type: Number, min: 0, max: 100000, default: 0 })
  sortOrder: number;
}

export const TestimonialSchema = SchemaFactory.createForClass(Testimonial);
TestimonialSchema.index({ status: 1, sortOrder: 1 }, { name: 'testimonial_status_sort' });
