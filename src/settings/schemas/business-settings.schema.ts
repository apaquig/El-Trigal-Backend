import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../common/schemas/schema-options';
import { brandColorsSchema, localizedTextSchema } from '../../common/schemas/shared.schema';

export const OFFICIAL_BRAND_COLORS = {
  brown: '#4A3C31',
  gold: '#D4AF37',
  goldSecondary: '#C5A059',
  cream: '#FDFBF7',
};

export interface BrandColors {
  brown: string;
  gold: string;
  goldSecondary: string;
  cream: string;
}

export type BusinessSettingsDocument = HydratedDocument<BusinessSettings>;

@Schema(baseSchemaOptions)
export class BusinessSettings {
  @Prop({ type: String, default: 'default', unique: true, immutable: true })
  key: 'default';

  @Prop({
    type: {
      colors: { type: brandColorsSchema, required: true, default: OFFICIAL_BRAND_COLORS },
    },
    required: true,
    default: { colors: OFFICIAL_BRAND_COLORS },
  })
  brand: { colors: BrandColors };

  @Prop({ type: localizedTextSchema, default: { es: 'El Trigal', en: 'El Trigal' } })
  businessName: { es: string; en: string };

  @Prop({ type: String, trim: true, default: null })
  publicEmail: string | null;

  @Prop({ type: String, trim: true, default: null })
  publicPhone: string | null;

  @Prop({ type: String, trim: true, default: null })
  phoneSecondary: string | null;

  @Prop({ type: String, trim: true, default: null })
  address: string | null;
}

export const BusinessSettingsSchema = SchemaFactory.createForClass(BusinessSettings);

BusinessSettingsSchema.index({ key: 1 }, { unique: true, name: 'settings_key_unique' });

BusinessSettingsSchema.pre('validate', function normalizeBrand() {
  const doc = this as BusinessSettingsDocument;
  doc.brand.colors = {
    brown: doc.brand.colors.brown.toUpperCase(),
    gold: doc.brand.colors.gold.toUpperCase(),
    goldSecondary: doc.brand.colors.goldSecondary.toUpperCase(),
    cream: doc.brand.colors.cream.toUpperCase(),
  };
});
