import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Status } from '../../common/dto/shared.dto';
import { baseSchemaOptions } from '../../common/schemas/schema-options';
import { localizedTextSchema } from '../../common/schemas/shared.schema';

export type FaqDocument = HydratedDocument<Faq>;

@Schema(baseSchemaOptions)
export class Faq {
  @Prop({ type: localizedTextSchema, required: true })
  question: { es: string; en: string };

  @Prop({ type: localizedTextSchema, required: true })
  answer: { es: string; en: string };

  @Prop({ type: String, enum: Object.values(Status), default: Status.DRAFT })
  status: Status;

  @Prop({ type: Number, min: 0, max: 100000, default: 0 })
  sortOrder: number;
}

export const FaqSchema = SchemaFactory.createForClass(Faq);
FaqSchema.index({ status: 1, sortOrder: 1 }, { name: 'faq_status_sort' });
