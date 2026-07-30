import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CLOUDINARY_PUBLIC_ID_REGEX, LocalizedTextDto } from '../../common/dto/shared.dto';
import { MediaFolder } from '../schemas/media-asset.schema';

export class CreateUploadSignatureDto {
  @ApiProperty({ enum: MediaFolder })
  @IsEnum(MediaFolder)
  folder: MediaFolder;

  @ApiProperty({ enum: ['image', 'video'] })
  @IsIn(['image', 'video'])
  resourceType: 'image' | 'video';
}

export class ConfirmMediaDto {
  @ApiProperty()
  @IsString()
  @Matches(CLOUDINARY_PUBLIC_ID_REGEX)
  publicId: string;

  @ApiProperty()
  @IsString()
  @Matches(/^https:\/\/.+/)
  secureUrl: string;

  @ApiProperty({ enum: ['image', 'video'] })
  @IsIn(['image', 'video'])
  resourceType: 'image' | 'video';

  @ApiProperty()
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

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  alt: LocalizedTextDto;

  @ApiPropertyOptional({ nullable: true, type: LocalizedTextDto })
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

  @ApiProperty({ enum: MediaFolder })
  @IsEnum(MediaFolder)
  folder: MediaFolder;
}
