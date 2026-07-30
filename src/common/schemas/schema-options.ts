import { SchemaOptions } from 'mongoose';

export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.passwordHash;
      delete ret.refreshTokenHash;
      delete ret.tokenHash;
      return ret;
    },
  },
};
