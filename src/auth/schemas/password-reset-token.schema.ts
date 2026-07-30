import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/schemas/schema-options';

export type PasswordResetTokenDocument = HydratedDocument<PasswordResetToken>;

@Schema(baseSchemaOptions)
export class PasswordResetToken {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true, select: false })
  tokenHash: string;

  @Prop({ type: Date, required: true, index: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  usedAt: Date | null;
}

export const PasswordResetTokenSchema = SchemaFactory.createForClass(PasswordResetToken);
PasswordResetTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'password_reset_ttl' },
);
PasswordResetTokenSchema.index({ userId: 1, usedAt: 1 }, { name: 'password_reset_user_used' });
