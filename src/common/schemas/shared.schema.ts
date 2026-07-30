import { Schema } from 'mongoose';
import {
  CLOUDINARY_PUBLIC_ID_REGEX,
  HEX_COLOR_REGEX,
  SKU_REGEX,
  SLUG_REGEX,
} from '../dto/shared.dto';

export const localizedTextSchema = new Schema(
  {
    es: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true },
  },
  { _id: false },
);

export const nullableLocalizedTextSchema = new Schema(
  {
    es: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true },
  },
  { _id: false },
);

export const seoFieldsSchema = new Schema(
  {
    title: { type: String, trim: true, maxlength: 70, default: null },
    description: { type: String, trim: true, maxlength: 160, default: null },
    canonicalSlug: { type: String, trim: true, maxlength: 120, default: null },
  },
  { _id: false },
);

export const brandColorsSchema = new Schema(
  {
    brown: { type: String, required: true, match: HEX_COLOR_REGEX, uppercase: true },
    gold: { type: String, required: true, match: HEX_COLOR_REGEX, uppercase: true },
    goldSecondary: { type: String, required: true, match: HEX_COLOR_REGEX, uppercase: true },
    cream: { type: String, required: true, match: HEX_COLOR_REGEX, uppercase: true },
  },
  { _id: false },
);

export const availabilitySchema = new Schema(
  {
    status: {
      type: String,
      enum: ['available', 'out-of-stock', 'preorder', 'seasonal', 'discontinued'],
      required: true,
      default: 'available',
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    leadTimeHours: { type: Number, min: 0, max: 8760, default: null },
    dailyStock: { type: Number, min: 0, max: 100000, default: null },
  },
  { _id: false },
);

availabilitySchema.pre('validate', function validateDateRange() {
  const value = this as { startDate?: Date | null; endDate?: Date | null };
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    throw new Error('endDate cannot be before startDate.');
  }
});

export const orderingSchema = new Schema(
  {
    onlineOrderingEnabled: { type: Boolean, required: true, default: false },
    pickupEnabled: { type: Boolean, required: true, default: false },
    deliveryEnabled: { type: Boolean, required: true, default: false },
    quoteRequired: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

export const preparationSchema = new Schema(
  {
    leadTimeHours: { type: Number, min: 0, max: 8760, default: null },
    instructions: { type: nullableLocalizedTextSchema, default: null },
  },
  { _id: false },
);

export const mediaAssetEmbeddedSchema = new Schema(
  {
    id: { type: String, required: true },
    publicId: { type: String, required: true, match: CLOUDINARY_PUBLIC_ID_REGEX },
    secureUrl: { type: String, required: true, match: /^https:\/\// },
    resourceType: { type: String, enum: ['image', 'video'], required: true },
    format: { type: String, required: true, lowercase: true, trim: true },
    width: { type: Number, required: true, min: 1, max: 12000 },
    height: { type: Number, required: true, min: 1, max: 12000 },
    bytes: { type: Number, required: true, min: 1 },
    alt: { type: localizedTextSchema, required: true },
    caption: { type: nullableLocalizedTextSchema, default: null },
    isPrimary: { type: Boolean, required: true, default: false },
    sortOrder: { type: Number, min: 0, max: 10000, default: 0 },
  },
  { _id: false },
);

export const productVariantSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: localizedTextSchema, required: true },
    sku: { type: String, match: SKU_REGEX, uppercase: true, trim: true, default: null },
    priceCents: { type: Number, required: true, min: 0, max: 100000000 },
    compareAtPriceCents: { type: Number, min: 0, max: 100000000, default: null },
    minServings: { type: Number, min: 1, max: 1000, required: true },
    maxServings: { type: Number, min: 1, max: 1000, required: true },
    available: { type: Boolean, required: true, default: true },
    sortOrder: { type: Number, min: 0, max: 10000, default: 0 },
  },
  { _id: false },
);

productVariantSchema.pre('validate', function validateVariant() {
  const variant = this as {
    priceCents?: number;
    compareAtPriceCents?: number | null;
    minServings?: number;
    maxServings?: number;
  };

  if (
    variant.compareAtPriceCents !== null &&
    variant.compareAtPriceCents !== undefined &&
    variant.priceCents !== undefined &&
    variant.compareAtPriceCents < variant.priceCents
  ) {
    throw new Error('variant compareAtPriceCents must be greater than or equal to priceCents.');
  }

  if (
    variant.minServings !== undefined &&
    variant.maxServings !== undefined &&
    variant.maxServings < variant.minServings
  ) {
    throw new Error('variant maxServings must be greater than or equal to minServings.');
  }
});

export const productOptionValueSchema = new Schema(
  {
    label: { type: localizedTextSchema, required: true },
    priceModifierCents: {
      type: Number,
      min: -100000000,
      max: 100000000,
      default: 0,
    },
    sortOrder: { type: Number, min: 0, max: 10000, default: 0 },
  },
  { _id: false },
);

export const productOptionSchema = new Schema(
  {
    name: { type: localizedTextSchema, required: true },
    type: { type: String, enum: ['single', 'multiple', 'text'], required: true },
    required: { type: Boolean, required: true, default: false },
    values: {
      type: [productOptionValueSchema],
      validate: [(values: unknown[]) => values.length <= 50, 'options can have at most 50 values.'],
      default: [],
    },
    sortOrder: { type: Number, min: 0, max: 10000, default: 0 },
  },
  { _id: false },
);

export { SLUG_REGEX, SKU_REGEX };
