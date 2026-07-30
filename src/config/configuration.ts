import { splitOrigins } from './env.validation';

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  mongoUri: string;
  jsonBodyLimit: string;
  publicOrigins: string[];
  adminOrigins: string[];
  angularPanelUrl: string;
  cookieDomain: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    issuer: string;
    audience: string;
    accessTtl: string;
    refreshTtlDays: number;
  };
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    allowedPrefix: string;
    videoMaxBytes: number;
  };
  rateLimit: {
    ttlMs: number;
    publicLimit: number;
    authLimit: number;
  };
  argon2: {
    memoryCost: number;
    timeCost: number;
    parallelism: number;
  };
}

export default (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV ?? 'development') as AppConfig['nodeEnv'],
  port: Number(process.env.PORT ?? 3000),
  mongoUri: process.env.MONGODB_URI ?? '',
  jsonBodyLimit: process.env.JSON_BODY_LIMIT ?? '1mb',
  publicOrigins: splitOrigins(process.env.PUBLIC_ORIGINS),
  adminOrigins: splitOrigins(process.env.ADMIN_ORIGINS),
  angularPanelUrl: process.env.ANGULAR_PANEL_URL ?? '',
  cookieDomain: process.env.COOKIE_DOMAIN ?? '',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    issuer: process.env.JWT_ISSUER ?? 'el-trigal-api',
    audience: process.env.JWT_AUDIENCE ?? 'el-trigal-admin',
    accessTtl: '15m',
    refreshTtlDays: 30,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    allowedPrefix: process.env.CLOUDINARY_ALLOWED_PREFIX ?? 'el-trigal/',
    videoMaxBytes: Number(process.env.CLOUDINARY_VIDEO_MAX_BYTES ?? 52_428_800),
  },
  rateLimit: {
    ttlMs: Number(process.env.RATE_LIMIT_TTL_MS ?? 60_000),
    publicLimit: Number(process.env.RATE_LIMIT_PUBLIC ?? 120),
    authLimit: Number(process.env.RATE_LIMIT_AUTH ?? 10),
  },
  argon2: {
    memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? 65_536),
    timeCost: Number(process.env.ARGON2_TIME_COST ?? 3),
    parallelism: Number(process.env.ARGON2_PARALLELISM ?? 1),
  },
});
