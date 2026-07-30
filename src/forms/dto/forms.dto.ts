import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  Equals,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AdminListQueryDto, Locale } from '../../common/dto/shared.dto';
import { sanitizePlainText } from '../../common/utils/text';
import { CustomCakeRequestStatus } from '../schemas/custom-cake-request.schema';

const NAME_REGEX = /^[\p{L}\p{M}' -]+$/u;
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

export enum CakeEventType {
  BIRTHDAY = 'birthday',
  WEDDING = 'wedding',
  QUINCEANERA = 'quinceanera',
  CORPORATE = 'corporate',
  OTHER = 'other',
}

export class ContactDto {
  @ApiProperty({ minLength: 2, maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  @Matches(NAME_REGEX)
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({ maxLength: 254 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(E164_REGEX)
  phone?: string | null;

  @ApiProperty({ minLength: 3, maxLength: 100 })
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  subject: string;

  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;

  @ApiProperty({ enum: Locale })
  @IsEnum(Locale)
  locale: Locale;

  @ApiPropertyOptional({ description: 'Debe llegar vacio.' })
  @IsOptional()
  @Equals('')
  honeypot?: string;
}

export class CustomCakeRequestDto {
  @ApiProperty({ minLength: 2, maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  @Matches(NAME_REGEX)
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({ maxLength: 254 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty()
  @IsString()
  @Matches(E164_REGEX)
  phone: string;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  eventDate: string;

  @ApiProperty({ enum: CakeEventType })
  @IsEnum(CakeEventType)
  eventType: CakeEventType;

  @ApiProperty({ minimum: 1, maximum: 500 })
  @IsInt()
  @Min(1)
  @Max(500)
  servings: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1000000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  budgetCents?: number;

  @ApiProperty({ minLength: 1, maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  flavor: string;

  @ApiProperty({ minLength: 1, maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  filling: string;

  @ApiProperty({ minLength: 1, maxLength: 120 })
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  theme: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 5 })
  @IsOptional()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsMongoId({ each: true })
  imageIds?: string[];

  @ApiProperty({ enum: Locale })
  @IsEnum(Locale)
  locale: Locale;

  @ApiProperty()
  @Equals(true)
  consent: true;

  @ApiPropertyOptional({ description: 'Debe llegar vacio.' })
  @IsOptional()
  @Equals('')
  honeypot?: string;
}

export class AdminCakeRequestQueryDto extends AdminListQueryDto {
  @ApiPropertyOptional({ enum: CustomCakeRequestStatus })
  @IsOptional()
  @IsEnum(CustomCakeRequestStatus)
  status?: CustomCakeRequestStatus;
}

export class UpdateCakeRequestDto {
  @ApiPropertyOptional({ enum: CustomCakeRequestStatus })
  @IsOptional()
  @IsEnum(CustomCakeRequestStatus)
  status?: CustomCakeRequestStatus;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? sanitizePlainText(value) : value))
  @IsString()
  @MaxLength(2000)
  internalNotes?: string | null;
}
