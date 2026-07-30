import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../common/schemas/schema-options';
import { Role } from '../roles.enum';

export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

export type UserDocument = HydratedDocument<User>;

@Schema(baseSchemaOptions)
export class User {
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 })
  email: string;

  @Prop({ type: String, required: true, select: false })
  passwordHash: string;

  @Prop({ type: String, enum: Object.values(Role), default: Role.EDITOR, required: true })
  role: Role;

  @Prop({
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE,
    required: true,
  })
  status: UserStatus;

  @Prop({ type: Number, default: 0, min: 0 })
  failedLoginAttempts: number;

  @Prop({ type: Date, default: null })
  lockedUntil: Date | null;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date | null;

  @Prop({ type: Number, default: 0, min: 0 })
  sessionVersion: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { unique: true, name: 'user_email_unique' });
