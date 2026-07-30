import 'reflect-metadata';
import mongoose from 'mongoose';
import { config as loadEnv } from 'dotenv';
import { User, UserSchema } from '../src/auth/schemas/user.schema';
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from '../src/auth/schemas/password-reset-token.schema';
import { RefreshSession, RefreshSessionSchema } from '../src/auth/schemas/refresh-session.schema';
import { Category, CategorySchema } from '../src/catalog/schemas/category.schema';
import { Product, ProductSchema } from '../src/catalog/schemas/product.schema';
import { Faq, FaqSchema } from '../src/content/schemas/faq.schema';
import { GalleryItem, GalleryItemSchema } from '../src/content/schemas/gallery-item.schema';
import { Testimonial, TestimonialSchema } from '../src/content/schemas/testimonial.schema';
import { AuditLog, AuditLogSchema } from '../src/audit/schemas/audit-log.schema';
import { ContactMessage, ContactMessageSchema } from '../src/forms/schemas/contact-message.schema';
import {
  CustomCakeRequest,
  CustomCakeRequestSchema,
} from '../src/forms/schemas/custom-cake-request.schema';
import { MediaAsset, MediaAssetSchema } from '../src/media/schemas/media-asset.schema';
import {
  BusinessSettings,
  BusinessSettingsSchema,
} from '../src/settings/schemas/business-settings.schema';

loadEnv();

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required.');
  }

  await mongoose.connect(uri);
  const models = [
    mongoose.model(User.name, UserSchema),
    mongoose.model(RefreshSession.name, RefreshSessionSchema),
    mongoose.model(PasswordResetToken.name, PasswordResetTokenSchema),
    mongoose.model(Category.name, CategorySchema),
    mongoose.model(Product.name, ProductSchema),
    mongoose.model(MediaAsset.name, MediaAssetSchema),
    mongoose.model(BusinessSettings.name, BusinessSettingsSchema),
    mongoose.model(Faq.name, FaqSchema),
    mongoose.model(Testimonial.name, TestimonialSchema),
    mongoose.model(GalleryItem.name, GalleryItemSchema),
    mongoose.model(ContactMessage.name, ContactMessageSchema),
    mongoose.model(CustomCakeRequest.name, CustomCakeRequestSchema),
    mongoose.model(AuditLog.name, AuditLogSchema),
  ];

  for (const model of models) {
    await model.syncIndexes();
    console.log(`synced indexes: ${model.modelName}`);
  }

  await mongoose.disconnect();
}

void main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
