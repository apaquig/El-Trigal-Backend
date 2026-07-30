import 'reflect-metadata';
import mongoose from 'mongoose';
import argon2 from 'argon2';
import { config as loadEnv } from 'dotenv';
import { Role } from '../src/auth/roles.enum';
import { User, UserSchema } from '../src/auth/schemas/user.schema';
import { Category, CategorySchema } from '../src/catalog/schemas/category.schema';
import { Status } from '../src/common/dto/shared.dto';
import {
  BusinessSettings,
  BusinessSettingsSchema,
  OFFICIAL_BRAND_COLORS,
} from '../src/settings/schemas/business-settings.schema';

loadEnv();

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required.');
  }

  await mongoose.connect(uri);
  const UserModel = mongoose.model(User.name, UserSchema);
  const CategoryModel = mongoose.model(Category.name, CategorySchema);
  const SettingsModel = mongoose.model(BusinessSettings.name, BusinessSettingsSchema);

  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? 'owner@eltrigal.example';
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? 'ChangeMe123!';

  await UserModel.updateOne(
    { email: ownerEmail },
    {
      $setOnInsert: {
        email: ownerEmail,
        role: Role.OWNER,
        passwordHash: await argon2.hash(ownerPassword, { type: argon2.argon2id }),
      },
    },
    { upsert: true },
  );

  await SettingsModel.updateOne(
    { key: 'default' },
    {
      $setOnInsert: {
        key: 'default',
        brand: { colors: OFFICIAL_BRAND_COLORS },
      },
    },
    { upsert: true },
  );

  await CategoryModel.updateOne(
    { 'slug.es': 'panaderia' },
    {
      $setOnInsert: {
        name: { es: 'Panaderia', en: 'Bakery' },
        slug: { es: 'panaderia', en: 'bakery' },
        description: null,
        shortDescription: null,
        status: Status.PUBLISHED,
        featured: true,
        sortOrder: 10,
        seo: {},
      },
    },
    { upsert: true },
  );

  console.log(`Seed listo. Owner: ${ownerEmail}`);
  await mongoose.disconnect();
}

void main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
