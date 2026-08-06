import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsLaterOrEqualThan } from '../validators/is-later-or-equal.decorator';
import { sanitizeMarkdown, sanitizePlainText } from '../utils/text';

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
export const SKU_REGEX = /^[A-Z0-9][A-Z0-9._-]{1,39}$/;
export const CLOUDINARY_PUBLIC_ID_REGEX = /^el-trigal\/.+$/i;

export enum Locale {
  ES = 'es',
  EN = 'en',
}

export enum Status {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ProductType {
  SIMPLE = 'simple',
  VARIABLE = 'variable',
  CUSTOM = 'custom',
  SEASONAL = 'seasonal',
  RETAIL = 'retail',
}

export enum Allergen {
  MILK = 'milk',
  EGGS = 'eggs',
  WHEAT = 'wheat',
  SOY = 'soy',
  PEANUTS = 'peanuts',
  TREE_NUTS = 'tree-nuts',
  SESAME = 'sesame',
}

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  OUT_OF_STOCK = 'out-of-stock',
  PREORDER = 'preorder',
  SEASONAL = 'seasonal',
  DISCONTINUED = 'discontinued',
}

export class LocalizedTextDto {
  @ApiProperty({ minLength: 1, maxLength: 10000 })
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  es: string;

  @ApiProperty({ minLength: 1, maxLength: 10000 })
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  en: string;
}

export class SeoFieldsDto {
  @ApiPropertyOptional({ nullable: true, maxLength: 70 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  @MaxLength(70)
  title?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 160 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  @MaxLength(160)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 120 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  @MaxLength(120)
  canonicalSlug?: string | null;
}

export class AvailabilityDto {
  @ApiProperty({ enum: AvailabilityStatus })
  @IsEnum(AvailabilityStatus)
  status: AvailabilityStatus;

  @ApiProperty({ type: [Number], description: '0 domingo a 6 sabado, sin duplicados.' })
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  availableDays: number[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  @IsLaterOrEqualThan('startDate', {
    message: 'La fecha final no puede ser anterior a la inicial.',
  })
  endDate?: string | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 8760 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(8760)
  leadTimeHours?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 100000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  dailyStock?: number | null;
}

export class OrderingOptionsDto {
  @ApiProperty({ default: true })
  @IsBoolean()
  onlineOrderingEnabled = true;

  @ApiProperty({ default: true })
  @IsBoolean()
  pickupEnabled = true;

  @ApiProperty({ default: true })
  @IsBoolean()
  deliveryEnabled = true;

  @ApiProperty({ default: false })
  @IsBoolean()
  quoteRequired = false;
}

export class PreparationDto {
  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 8760 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(8760)
  leadTimeHours?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  instructions?: LocalizedTextDto | null;
}

export class MediaAssetInputDto {
  @ApiProperty({ description: 'ID del media asset confirmado.' })
  @IsMongoId()
  id: string;

  @ApiProperty()
  @IsString()
  @Matches(CLOUDINARY_PUBLIC_ID_REGEX)
  publicId: string;

  @ApiProperty({ format: 'uri' })
  @IsString()
  @Matches(/^https:\/\/.+/)
  secureUrl: string;

  @ApiProperty({ enum: ['image', 'video'] })
  @IsIn(['image', 'video'])
  resourceType: 'image' | 'video';

  @ApiProperty()
  @Transform(({ value }) =>
    typeof value === 'string' ? sanitizePlainText(value).toLowerCase() : value,
  )
  @IsString()
  @MaxLength(20)
  format: string;

  @ApiProperty({ minimum: 1, maximum: 12000 })
  @IsInt()
  @Min(1)
  @Max(12000)
  width: number;

  @ApiProperty({ minimum: 1, maximum: 12000 })
  @IsInt()
  @Min(1)
  @Max(12000)
  height: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  bytes: number;

  @ApiProperty()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  alt: LocalizedTextDto;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  caption?: LocalizedTextDto | null;

  @ApiProperty()
  @IsBoolean()
  isPrimary: boolean;

  @ApiProperty({ minimum: 0, maximum: 10000 })
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder: number;
}

export class PublicListQueryDto {
  @ApiPropertyOptional({ enum: Locale, default: Locale.ES })
  @IsOptional()
  @IsEnum(Locale)
  locale: Locale = Locale.ES;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10000 })
  @IsOptional()
  @Transform(({ value }) => Number.parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => Number.parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}

export class AdminListQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10000 })
  @IsOptional()
  @Transform(({ value }) => Number.parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => Number.parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}

export class MarkdownTextDto extends LocalizedTextDto {
  @Transform(({ value }) => (typeof value === 'string' ? sanitizeMarkdown(value) : value))
  @IsString()
  @MinLength(1)
  override es: string;

  @Transform(({ value }) => (typeof value === 'string' ? sanitizeMarkdown(value) : value))
  @IsString()
  @MinLength(1)
  override en: string;
}

export function ensureUniqueNumberArray(value: number[]): boolean {
  return new Set(value).size === value.length;
}

export function ensureUniqueStringArray(value: string[]): boolean {
  return new Set(value.map((item) => item.toLocaleLowerCase('en-US'))).size === value.length;
}

export function ensureArrayMinMax<T>(value: T[], min: number, max: number): boolean {
  return value.length >= min && value.length <= max;
}

export { ArrayMaxSize, ArrayMinSize, IsArray, IsMongoId, MaxLength, MinLength, ValidateNested };
