import Joi from 'joi';

const csvOrigins = Joi.string()
  .custom((value: string, helpers) => {
    const origins = value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (origins.length === 0) {
      return helpers.error('any.invalid');
    }

    for (const origin of origins) {
      if (origin !== '*' && !/^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin)) {
        return helpers.error('any.invalid');
      }
    }

    return value;
  })
  .default('*');

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  MONGODB_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).default('development-only-access-secret-change-before-production-2026'),
  JWT_REFRESH_SECRET: Joi.string().min(32).default('development-only-refresh-secret-change-before-production-2026'),
  JWT_ISSUER: Joi.string().min(2).default('el-trigal-api'),
  JWT_AUDIENCE: Joi.string().min(2).default('el-trigal-admin'),
  COOKIE_DOMAIN: Joi.string().allow('').default(''),
  PUBLIC_ORIGINS: csvOrigins,
  ADMIN_ORIGINS: csvOrigins,
  ANGULAR_PANEL_URL: Joi.string().uri().default('http://localhost:4200'),
  CLOUDINARY_CLOUD_NAME: Joi.string().min(2).required(),
  CLOUDINARY_API_KEY: Joi.string().min(2).required(),
  CLOUDINARY_API_SECRET: Joi.string().min(8).required(),
  CLOUDINARY_ALLOWED_PREFIX: Joi.string().default('el-trigal/'),
  CLOUDINARY_VIDEO_MAX_BYTES: Joi.number().integer().min(1).default(52_428_800),
  JSON_BODY_LIMIT: Joi.string().default('1mb'),
  RATE_LIMIT_TTL_MS: Joi.number().integer().min(1000).default(60_000),
  RATE_LIMIT_PUBLIC: Joi.number().integer().min(1).default(120),
  RATE_LIMIT_AUTH: Joi.number().integer().min(1).default(10),
  ARGON2_MEMORY_COST: Joi.number().integer().min(19_456).default(65_536),
  ARGON2_TIME_COST: Joi.number().integer().min(2).default(3),
  ARGON2_PARALLELISM: Joi.number().integer().min(1).default(1),
  BREVO_API_KEY: Joi.string().allow('').default(''),
  BREVO_SENDER_EMAIL: Joi.string().email().default('admin@eltrigalbakery.com'),
  BREVO_SENDER_NAME: Joi.string().default('El Trigal Bakery'),
});

export function splitOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
