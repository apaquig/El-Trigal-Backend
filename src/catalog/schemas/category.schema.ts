import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Status } from '../../common/dto/shared.dto';
import { baseSchemaOptions } from '../../common/schemas/schema-options';
import {
  localizedTextSchema,
  mediaAssetEmbeddedSchema,
  nullableLocalizedTextSchema,
  seoFieldsSchema,
  SLUG_REGEX,
} from '../../common/schemas/shared.schema';

export type CategoryDocument = HydratedDocument<Category>;

const CategoryOriginSchema = new MongooseSchema(
  {
    type: { type: String, enum: ['local', 'imported'], default: 'local' },
    country: { type: String, default: 'United States' },
    countryCode: { type: String, default: 'US' },
  },
  { _id: false }
);

@Schema(baseSchemaOptions)
export class Category {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Category.name, default: null })
  parentId: Types.ObjectId | null;

  @Prop({ type: localizedTextSchema, required: true })
  name: { es: string; en: string };

  @Prop({ type: localizedTextSchema, required: true })
  slug: { es: string; en: string };

  @Prop({ type: nullableLocalizedTextSchema, default: null })
  description: { es: string; en: string } | null;

  @Prop({ type: nullableLocalizedTextSchema, default: null })
  shortDescription: { es: string; en: string } | null;

  @Prop({ type: mediaAssetEmbeddedSchema, default: null })
  image: Record<string, unknown> | null;

  @Prop({ type: String, enum: Object.values(Status), default: Status.DRAFT, required: true })
  status: Status;

  @Prop({ type: Boolean, default: false, required: true })
  featured: boolean;

  @Prop({ type: Number, min: 0, max: 100000, default: 0, required: true })
  sortOrder: number;

  @Prop({ type: String, enum: ['local', 'imported'], default: 'local', required: true })
  type: 'local' | 'imported';

  @Prop({
    type: CategoryOriginSchema,
    default: { type: 'local', country: 'United States', countryCode: 'US' },
  })
  origin: {
    type: 'local' | 'imported';
    country: string;
    countryCode: string;
  };

  @Prop({ type: seoFieldsSchema, default: {} })
  seo: Record<string, string | null>;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.pre('validate', function syncOriginAndType() {
  const doc = this as CategoryDocument;
  if (!doc.origin) {
    if (doc.type === 'imported') {
      doc.origin = { type: 'imported', country: 'Ecuador', countryCode: 'EC' };
    } else {
      doc.origin = { type: 'local', country: 'United States', countryCode: 'US' };
    }
  } else {
    doc.type = doc.origin.type;
  }
});

CategorySchema.index(
  { 'slug.es': 1 },
  {
    unique: true,
    partialFilterExpression: { 'slug.es': { $type: 'string' } },
    name: 'category_slug_es_unique',
  },
);
CategorySchema.index(
  { 'slug.en': 1 },
  {
    unique: true,
    partialFilterExpression: { 'slug.en': { $type: 'string' } },
    name: 'category_slug_en_unique',
  },
);
CategorySchema.index({ status: 1, sortOrder: 1 }, { name: 'category_status_sort' });
CategorySchema.index({ parentId: 1, status: 1 }, { name: 'category_parent_status' });
CategorySchema.index({ type: 1, status: 1 }, { name: 'category_type_status' });
CategorySchema.index({ 'name.es': 'text', 'name.en': 'text' }, { name: 'category_text' });

CategorySchema.path('slug').validate(function validateSlug(value: { es: string; en: string }) {
  return SLUG_REGEX.test(value.es) && SLUG_REGEX.test(value.en);
}, 'Category slugs must use lowercase ASCII kebab-case.');
