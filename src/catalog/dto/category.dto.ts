import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
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
import {
  LocalizedTextDto,
  MarkdownTextDto,
  PublicListQueryDto,
  SeoFieldsDto,
  SLUG_REGEX,
  Status,
} from '../../common/dto/shared.dto';
import { normalizeSlug, sanitizePlainText } from '../../common/utils/text';

class CategoryNameDto extends LocalizedTextDto {
  @MinLength(2)
  @MaxLength(80)
  override es: string;

  @MinLength(2)
  @MaxLength(80)
  override en: string;
}

class CategorySlugDto extends LocalizedTextDto {
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSlug(value) : value))
  @MinLength(2)
  @MaxLength(100)
  @Matches(SLUG_REGEX)
  override es: string;

  @Transform(({ value }) => (typeof value === 'string' ? normalizeSlug(value) : value))
  @MinLength(2)
  @MaxLength(100)
  @Matches(SLUG_REGEX)
  override en: string;
}

class CategoryShortDescriptionDto extends MarkdownTextDto {
  @MaxLength(300)
  override es: string;

  @MaxLength(300)
  override en: string;
}

class CategoryDescriptionDto extends MarkdownTextDto {
  @MaxLength(5000)
  override es: string;

  @MaxLength(5000)
  override en: string;
}

class CategoryOriginDto {
  @ApiProperty({ enum: ['local', 'imported'] })
  @IsIn(['local', 'imported'])
  type: 'local' | 'imported';

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  country: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  countryCode: string;
}

export class CreateCategoryDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsMongoId()
  parentId?: string | null;

  @ApiProperty({ type: CategoryNameDto })
  @ValidateNested()
  @Type(() => CategoryNameDto)
  name: CategoryNameDto;

  @ApiProperty({ type: CategorySlugDto })
  @ValidateNested()
  @Type(() => CategorySlugDto)
  slug: CategorySlugDto;

  @ApiPropertyOptional({ nullable: true, type: CategoryDescriptionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryDescriptionDto)
  description?: CategoryDescriptionDto | null;

  @ApiPropertyOptional({ nullable: true, type: CategoryShortDescriptionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryShortDescriptionDto)
  shortDescription?: CategoryShortDescriptionDto | null;

  @ApiPropertyOptional({ nullable: true, description: 'Media asset id confirmado.' })
  @IsOptional()
  @IsMongoId()
  imageId?: string | null;

  @ApiPropertyOptional({ enum: Status, default: Status.DRAFT })
  @IsOptional()
  @IsEnum(Status)
  status?: Status = Status.DRAFT;

  @ApiProperty({ enum: ['local', 'imported'], default: 'local' })
  @IsIn(['local', 'imported'])
  type: 'local' | 'imported';

  @ApiPropertyOptional({ type: CategoryOriginDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryOriginDto)
  origin?: CategoryOriginDto;

  @ApiProperty()
  @IsBoolean()
  featured: boolean;

  @ApiProperty({ minimum: 0, maximum: 100000 })
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder: number;

  @ApiPropertyOptional({ type: SeoFieldsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoFieldsDto)
  seo?: SeoFieldsDto;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class ReorderCategoryItemDto {
  @ApiProperty()
  @IsMongoId()
  id: string;

  @ApiProperty({ minimum: 0, maximum: 100000 })
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder: number;
}

export class ReorderCategoriesDto {
  @ApiProperty({ type: [ReorderCategoryItemDto], maxItems: 200 })
  @ValidateNested({ each: true })
  @Type(() => ReorderCategoryItemDto)
  @ArrayMaxSize(200)
  @ArrayUnique((item: ReorderCategoryItemDto) => item.id)
  items: ReorderCategoryItemDto[];
}

export class PublicCategoryQueryDto extends PublicListQueryDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ minLength: 2, maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  search?: string;
}
