import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Locale } from '../../common/dto/shared.dto';
import { baseSchemaOptions } from '../../common/schemas/schema-options';

export type ContactMessageDocument = HydratedDocument<ContactMessage>;

@Schema(baseSchemaOptions)
export class ContactMessage {
  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  name: string;

  @Prop({ type: String, required: true, lowercase: true, trim: true, maxlength: 254 })
  email: string;

  @Prop({ type: String, default: null, trim: true })
  phone: string | null;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  subject: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 2000 })
  message: string;

  @Prop({ type: String, enum: Object.values(Locale), required: true })
  locale: Locale;

  @Prop({ type: String, default: 'new', enum: ['new', 'reviewed', 'archived'] })
  status: 'new' | 'reviewed' | 'archived';
}

export const ContactMessageSchema = SchemaFactory.createForClass(ContactMessage);
ContactMessageSchema.index({ createdAt: -1 }, { name: 'contact_created_at' });
ContactMessageSchema.index({ email: 1, createdAt: -1 }, { name: 'contact_email_created' });
