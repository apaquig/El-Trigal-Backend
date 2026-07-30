import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/schemas/schema-options';

export type RefreshSessionDocument = HydratedDocument<RefreshSession>;

@Schema(baseSchemaOptions)
export class RefreshSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  familyId: string;

  @Prop({ type: String, required: true, unique: true, select: false })
  tokenHash: string;

  @Prop({ type: String, default: null })
  replacedByTokenHash: string | null;

  @Prop({ type: Date, required: true, index: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  @Prop({ type: String, default: null })
  userAgentHash: string | null;

  @Prop({ type: String, default: null })
  ipHash: string | null;
}

export const RefreshSessionSchema = SchemaFactory.createForClass(RefreshSession);
RefreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'refresh_ttl' });
RefreshSessionSchema.index({ userId: 1, familyId: 1 }, { name: 'refresh_user_family' });
