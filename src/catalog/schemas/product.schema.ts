import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Allergen, ProductType, Status } from '../../common/dto/shared.dto';
import { baseSchemaOptions } from '../../common/schemas/schema-options';
import {
  availabilitySchema,
  localizedTextSchema,
  mediaAssetEmbeddedSchema,
  nullableLocalizedTextSchema,
  orderingSchema,
  preparationSchema,
  productOptionSchema,
  productVariantSchema,
  seoFieldsSchema,
  SKU_REGEX,
  SLUG_REGEX,
} from '../../common/schemas/shared.schema';

export type ProductDocument = HydratedDocument<Product>;

@Schema(baseSchemaOptions)
export class Product {
  @Prop({ type: localizedTextSchema, required: true })
  name: { es: string; en: string };

  @Prop({ type: localizedTextSchema, required: true })
  slug: { es: string; en: string };

  @Prop({ type: localizedTextSchema, required: true })
  description: { es: string; en: string };

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category', required: true })
  primaryCategoryId: Types.ObjectId;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Category' }],
    validate: {
      validator: (ids: Types.ObjectId[]) => ids.length >= 1 && ids.length <= 20,
      message: 'categoryIds must contain 1 to 20 ids.',
    },
    required: true,
  })
  categoryIds: Types.ObjectId[];

  @Prop({ type: String, enum: Object.values(ProductType), required: true })
  productType: ProductType;

  @Prop({ type: Number, min: 0, max: 100000000, default: null })
  basePriceCents: number | null;

  @Prop({ type: String, enum: ['USD'], default: 'USD', required: true })
  currency: 'USD';

  @Prop({ type: nullableLocalizedTextSchema, default: null })
  priceLabel: { es: string; en: string } | null;

  @Prop({
    type: [mediaAssetEmbeddedSchema],
    validate: [(media: unknown[]) => media.length <= 20, 'media can have at most 20 items.'],
    default: [],
  })
  media: Array<Record<string, unknown> & { isPrimary?: boolean; alt?: { es: string; en: string } }>;

  @Prop({ type: nullableLocalizedTextSchema, default: null })
  ingredients: { es: string; en: string } | null;

  @Prop({ type: [String], default: [] })
  allergens: string[];

  @Prop({ type: [String], default: [] })
  dietaryTags: string[];

  @Prop({ type: availabilitySchema, required: true, default: {} })
  availability: Record<string, unknown>;

  @Prop({ type: orderingSchema, required: true, default: {} })
  ordering: {
    onlineOrderingEnabled: boolean;
    pickupEnabled: boolean;
    deliveryEnabled: boolean;
    quoteRequired: boolean;
  };

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Number, min: 0, max: 100000, default: 0, required: true })
  sortOrder: number;

  @Prop({
    type: {
      title: { type: String, trim: true, default: null },
      description: { type: String, trim: true, default: null },
      canonicalSlug: { type: String, trim: true, default: null },
      es: {
        metaTitle: { type: String, trim: true, default: null },
        metaDescription: { type: String, trim: true, default: null },
        isReviewed: { type: Boolean, default: false },
      },
      en: {
        metaTitle: { type: String, trim: true, default: null },
        metaDescription: { type: String, trim: true, default: null },
        isReviewed: { type: Boolean, default: false },
      },
    },
    default: {},
    _id: false,
  })
  seo: {
    title?: string | null;
    description?: string | null;
    canonicalSlug?: string | null;
    es?: {
      metaTitle: string | null;
      metaDescription: string | null;
      isReviewed: boolean;
    };
    en?: {
      metaTitle: string | null;
      metaDescription: string | null;
      isReviewed: boolean;
    };
  };

  @Prop({
    type: {
      en: {
        name: { type: String, trim: true, default: null },
        description: { type: String, trim: true, default: null },
      },
    },
    default: {},
    _id: false,
  })
  translations?: {
    en?: {
      name?: string;
      description?: string;
    };
  };

  @Prop({ type: String, enum: ['local', 'imported'], default: 'local', required: true })
  type: 'local' | 'imported';

  @Prop({ type: String, default: null })
  doorDashUrl: string | null;

  @Prop({ type: String, default: null })
  uberEatsUrl: string | null;

  @Prop({ type: Boolean, default: false, required: true })
  published: boolean;

  @Prop({ type: Boolean, default: false, required: true })
  featured: boolean;

  @Prop({ type: Date, default: null })
  publishedAt: Date | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);


ProductSchema.index(
  { 'slug.es': 1 },
  {
    unique: true,
    partialFilterExpression: { 'slug.es': { $type: 'string' } },
    name: 'product_slug_es_unique',
  },
);
ProductSchema.index(
  { 'slug.en': 1 },
  {
    unique: true,
    partialFilterExpression: { 'slug.en': { $type: 'string' } },
    name: 'product_slug_en_unique',
  },
);
ProductSchema.index({ published: 1, categoryIds: 1, sortOrder: 1 }, { name: 'product_category_sort' });
ProductSchema.index({ published: 1, featured: 1 }, { name: 'product_featured' });
ProductSchema.index({ createdAt: -1 }, { name: 'product_created_at' });
ProductSchema.index(
  {
    'name.es': 'text',
    'name.en': 'text',
    'description.es': 'text',
    'description.en': 'text',
    tags: 'text',
  },
  { name: 'product_text' },
);

ProductSchema.path('slug').validate(function validateSlug(value: { es: string; en: string }) {
  return SLUG_REGEX.test(value.es) && SLUG_REGEX.test(value.en);
}, 'Product slugs must use lowercase ASCII kebab-case.');

ProductSchema.pre('validate', function validateProduct() {
  const product = this as ProductDocument;

  // Initialize localized SEO structure if not present
  if (!product.seo) {
    product.seo = {};
  }
  if (!product.seo.es) {
    product.seo.es = { metaTitle: null, metaDescription: null, isReviewed: false };
  }
  if (!product.seo.en) {
    product.seo.en = { metaTitle: null, metaDescription: null, isReviewed: false };
  }

  // Populate backward compatible fields from Spanish SEO
  product.seo.title = product.seo.es.metaTitle;
  product.seo.description = product.seo.es.metaDescription;

  const primaryCategory = String(product.primaryCategoryId);
  const categories = product.categoryIds.map((id) => String(id));
  if (!categories.includes(primaryCategory)) {
    throw new Error('categoryIds must include primaryCategoryId.');
  }

  if (new Set(categories).size !== categories.length) {
    throw new Error('categoryIds must be unique.');
  }

  if (product.media.filter((asset) => asset.isPrimary).length > 1) {
    throw new Error('media can contain at most one primary asset.');
  }

  if (
    new Set(product.tags.map((tag) => tag.toLocaleLowerCase('en-US'))).size !== product.tags.length
  ) {
    throw new Error('tags must be unique.');
  }

  if (
    new Set(product.dietaryTags.map((tag) => tag.toLocaleLowerCase('en-US'))).size !==
    product.dietaryTags.length
  ) {
    throw new Error('dietaryTags must be unique.');
  }

  if (new Set(product.allergens).size !== product.allergens.length) {
    throw new Error('allergens must be unique.');
  }
});
