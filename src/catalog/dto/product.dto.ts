import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
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
import { randomUUID } from 'node:crypto';
import {
  AdminListQueryDto,
  Allergen,
  AvailabilityDto,
  AvailabilityStatus,
  LocalizedTextDto,
  MarkdownTextDto,
  MediaAssetInputDto,
  OrderingOptionsDto,
  PreparationDto,
  ProductType,
  PublicListQueryDto,
  SeoFieldsDto,
  SKU_REGEX,
  SLUG_REGEX,
  Status,
} from '../../common/dto/shared.dto';
import { IsCompareAtGreaterOrEqual } from '../../common/validators/is-price-valid.decorator';
import {
  normalizeSku,
  normalizeSlug,
  sanitizePlainText,
  uniqueNormalized,
} from '../../common/utils/text';

class ProductNameDto extends LocalizedTextDto {
  @MinLength(2)
  @MaxLength(120)
  override es: string;

  @MinLength(2)
  @MaxLength(120)
  override en: string;
}

class ProductSlugDto extends LocalizedTextDto {
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSlug(value) : value))
  @MinLength(2)
  @MaxLength(140)
  @Matches(SLUG_REGEX)
  override es: string;

  @Transform(({ value }) => (typeof value === 'string' ? normalizeSlug(value) : value))
  @MinLength(2)
  @MaxLength(140)
  @Matches(SLUG_REGEX)
  override en: string;
}



class ProductDescriptionDto extends MarkdownTextDto {
  @MinLength(1)
  @MaxLength(10000)
  override es: string;

  @MinLength(1)
  @MaxLength(10000)
  override en: string;
}

class ProductIngredientsDto {
  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  es: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  en?: string;
}

class ProductPriceLabelDto extends LocalizedTextDto {
  @MinLength(1)
  @MaxLength(80)
  override es: string;

  @MinLength(1)
  @MaxLength(80)
  override en: string;
}

export class ProductVariantDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  id?: string = randomUUID();

  @ApiProperty()
  @ValidateNested()
  @Type(() => ProductPriceLabelDto)
  name: ProductPriceLabelDto;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSku(value) : value))
  @IsString()
  @Matches(SKU_REGEX)
  sku?: string | null;

  @ApiProperty({ minimum: 0, maximum: 100000000 })
  @IsInt()
  @Min(0)
  @Max(100000000)
  priceCents: number;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 100000000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000000)
  @IsCompareAtGreaterOrEqual('priceCents')
  compareAtPriceCents?: number | null;

  @ApiProperty({ minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  minServings: number;

  @ApiProperty({ minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  maxServings: number;

  @ApiProperty()
  @IsBoolean()
  available: boolean;

  @ApiProperty({ minimum: 0, maximum: 10000 })
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder: number;
}

export class ProductOptionValueDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => ProductPriceLabelDto)
  label: ProductPriceLabelDto;

  @ApiPropertyOptional({ default: 0, minimum: -100000000, maximum: 100000000 })
  @IsOptional()
  @IsInt()
  @Min(-100000000)
  @Max(100000000)
  priceModifierCents = 0;

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder = 0;
}

export class ProductOptionDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => ProductPriceLabelDto)
  name: ProductPriceLabelDto;

  @ApiProperty({ enum: ['single', 'multiple', 'text'] })
  @IsIn(['single', 'multiple', 'text'])
  type: 'single' | 'multiple' | 'text';

  @ApiProperty()
  @IsBoolean()
  required: boolean;

  @ApiProperty({ type: [ProductOptionValueDto], maxItems: 50 })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProductOptionValueDto)
  values: ProductOptionValueDto[];

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder = 0;
}

class SeoLanguageDetailsDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  metaTitle?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(155)
  metaDescription?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isReviewed?: boolean;
}

class ProductSeoLocalizedDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  canonicalSlug?: string | null;

  @ApiPropertyOptional({ type: SeoLanguageDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoLanguageDetailsDto)
  es?: SeoLanguageDetailsDto;

  @ApiPropertyOptional({ type: SeoLanguageDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoLanguageDetailsDto)
  en?: SeoLanguageDetailsDto;
}

class ProductTranslationEnDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

class ProductTranslationsDto {
  @ApiPropertyOptional({ type: ProductTranslationEnDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductTranslationEnDto)
  en?: ProductTranslationEnDto;
}

export class CreateProductDto {

  @ApiProperty()
  @ValidateNested()
  @Type(() => ProductNameDto)
  name: ProductNameDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ProductSlugDto)
  slug: ProductSlugDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ProductDescriptionDto)
  description: ProductDescriptionDto;

  @ApiProperty()
  @IsMongoId()
  primaryCategoryId: string;

  @ApiProperty({ type: [String], minItems: 1, maxItems: 20 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsMongoId({ each: true })
  categoryIds: string[];

  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  productType: ProductType;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 100000000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000000)
  basePriceCents?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 100000000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000000)
  @IsCompareAtGreaterOrEqual('basePriceCents')
  compareAtPriceCents?: number | null;

  @ApiProperty({ enum: ['USD'] })
  @IsIn(['USD'])
  currency: 'USD';

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductPriceLabelDto)
  priceLabel?: ProductPriceLabelDto | null;

  @ApiPropertyOptional({ type: [ProductVariantDto], maxItems: 50, default: [] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[] = [];

  @ApiPropertyOptional({ type: [ProductOptionDto], default: [] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  options?: ProductOptionDto[] = [];

  @ApiPropertyOptional({ type: [MediaAssetInputDto], maxItems: 20, default: [] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MediaAssetInputDto)
  media?: MediaAssetInputDto[] = [];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductIngredientsDto)
  ingredients?: ProductIngredientsDto | null;

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  allergens?: string[] = [];

  @ApiPropertyOptional({ type: [String], maxItems: 30, default: [] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @Transform(({ value }) => (Array.isArray(value) ? uniqueNormalized(value) : value))
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(40, { each: true })
  dietaryTags?: string[] = [];

  @ApiPropertyOptional({ type: AvailabilityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AvailabilityDto)
  availability?: AvailabilityDto = {
    status: AvailabilityStatus.AVAILABLE,
    availableDays: [0, 1, 2, 3, 4, 5, 6]
  };

  @ApiPropertyOptional({ type: OrderingOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderingOptionsDto)
  ordering?: OrderingOptionsDto = new OrderingOptionsDto();

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreparationDto)
  preparation?: PreparationDto | null;

  @ApiPropertyOptional({ type: [String], maxItems: 30, default: [] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @Transform(({ value }) => (Array.isArray(value) ? uniqueNormalized(value) : value))
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(40, { each: true })
  tags?: string[] = [];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  bestSeller?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  newProduct?: boolean = false;

  @ApiPropertyOptional({ minimum: 0, maximum: 100000, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number = 0;

  @ApiPropertyOptional({ type: ProductSeoLocalizedDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductSeoLocalizedDto)
  seo?: ProductSeoLocalizedDto;

  @ApiPropertyOptional({ type: ProductTranslationsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductTranslationsDto)
  translations?: ProductTranslationsDto;

  @ApiProperty({ enum: ['local', 'imported'] })
  @IsIn(['local', 'imported'])
  type: 'local' | 'imported';

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  doorDashUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  uberEatsUrl?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean = false;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class PublicProductQueryDto extends PublicListQueryDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  bestSeller?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  newProduct?: boolean;

  @ApiPropertyOptional({ enum: AvailabilityStatus })
  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availability?: AvailabilityStatus;

  @ApiPropertyOptional({ enum: ['sortOrder', 'name', 'price-asc', 'price-desc', 'newest'] })
  @IsOptional()
  @IsIn(['sortOrder', 'name', 'price-asc', 'price-desc', 'newest'])
  sort?: 'sortOrder' | 'name' | 'price-asc' | 'price-desc' | 'newest' = 'sortOrder';

  @ApiPropertyOptional({ enum: ['local', 'imported'] })
  @IsOptional()
  @IsIn(['local', 'imported'])
  type?: 'local' | 'imported';
}

export class AdminProductQueryDto extends AdminListQueryDto {
  @ApiPropertyOptional({ enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional({ enum: ['local', 'imported'] })
  @IsOptional()
  @IsIn(['local', 'imported'])
  type?: 'local' | 'imported';

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  search?: string;
}

export class GenerateSeoDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsMongoId()
  primaryCategoryId: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  allergens: string[];

  @ApiPropertyOptional()
  @IsOptional()
  price?: number;
}
