import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { HEX_COLOR_REGEX, LocalizedTextDto } from '../../common/dto/shared.dto';

export class BrandColorsDto {
  @ApiProperty({ example: '#4A3C31' })
  @IsString()
  @Matches(HEX_COLOR_REGEX)
  brown: string;

  @ApiProperty({ example: '#D4AF37' })
  @IsString()
  @Matches(HEX_COLOR_REGEX)
  gold: string;

  @ApiProperty({ example: '#C5A059' })
  @IsString()
  @Matches(HEX_COLOR_REGEX)
  goldSecondary: string;

  @ApiProperty({ example: '#FDFBF7' })
  @IsString()
  @Matches(HEX_COLOR_REGEX)
  cream: string;
}

export class BrandSettingsDto {
  @ApiProperty({ type: BrandColorsDto })
  @ValidateNested()
  @Type(() => BrandColorsDto)
  colors: BrandColorsDto;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ type: BrandSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandSettingsDto)
  brand?: BrandSettingsDto;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  businessName?: LocalizedTextDto;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  publicEmail?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  publicPhone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string | null;
}
