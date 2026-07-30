import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { baseSchemaOptions } from '../../common/schemas/schema-options';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema(baseSchemaOptions)
export class AuditLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null, index: true })
  userId: Types.ObjectId | null;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  action: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  resourceType: string;

  @Prop({ type: String, default: null, trim: true, maxlength: 120 })
  resourceId: string | null;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 }, { name: 'audit_created_at' });
AuditLogSchema.index({ userId: 1, createdAt: -1 }, { name: 'audit_user_created' });
AuditLogSchema.index(
  { resourceType: 1, resourceId: 1, createdAt: -1 },
  { name: 'audit_resource_created' },
);
