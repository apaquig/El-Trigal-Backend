import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../auth/roles.enum';
import { UpdateSettingsDto } from './dto/settings.dto';
import {
  BrandColors,
  BusinessSettings,
  BusinessSettingsDocument,
  OFFICIAL_BRAND_COLORS,
} from './schemas/business-settings.schema';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(BusinessSettings.name)
    private readonly settingsModel: Model<BusinessSettingsDocument>,
  ) {}

  async getPublicSettings(): Promise<Pick<BusinessSettings, 'brand'>> {
    const settings = await this.getOrCreate();
    return {
      brand: {
        colors: this.normalizeBrandColors(settings.brand.colors),
      },
    };
  }

  async getAdminSettings(): Promise<BusinessSettings> {
    return this.getOrCreate();
  }

  async updateSettings(dto: UpdateSettingsDto, role: Role): Promise<BusinessSettings> {
    if (dto.brand && role !== Role.OWNER) {
      throw new ForbiddenException('Solo OWNER puede editar configuracion de marca.');
    }

    const update: Record<string, unknown> = {};

    if (dto.brand?.colors) {
      update.brand = { colors: this.normalizeBrandColors(dto.brand.colors) };
    }

    if (dto.businessName !== undefined) {
      if (typeof dto.businessName === 'string') {
        update.businessName = { es: dto.businessName, en: dto.businessName };
      } else if (typeof dto.businessName === 'object' && dto.businessName !== null) {
        update.businessName = {
          es: dto.businessName.es || dto.businessName.en || '',
          en: dto.businessName.en || dto.businessName.es || '',
        };
      }
    }

    const email = dto.publicEmail ?? dto.email;
    if (email !== undefined) {
      update.publicEmail = email;
    }

    const phone = dto.publicPhone ?? dto.phonePrimary;
    if (phone !== undefined) {
      update.publicPhone = phone;
    }

    if (dto.address !== undefined) {
      if (typeof dto.address === 'string') {
        update.address = dto.address;
      } else if (typeof dto.address === 'object' && dto.address !== null) {
        const parts = [
          dto.address.street,
          dto.address.suite,
          dto.address.city,
          dto.address.state ? `${dto.address.state} ${dto.address.zip || ''}`.trim() : dto.address.zip,
        ].filter(Boolean);
        update.address = parts.join(', ');
      } else {
        update.address = null;
      }
    }

    return this.settingsModel
      .findOneAndUpdate({ key: 'default' }, { $set: update }, { upsert: true, new: true })
      .lean<BusinessSettings>()
      .exec();
  }

  private async getOrCreate(): Promise<BusinessSettings> {
    return this.settingsModel
      .findOneAndUpdate(
        { key: 'default' },
        {
          $setOnInsert: {
            key: 'default',
            brand: { colors: OFFICIAL_BRAND_COLORS },
          },
        },
        { upsert: true, new: true },
      )
      .lean<BusinessSettings>()
      .exec();
  }

  private normalizeBrandColors(colors: BrandColors): BrandColors {
    return {
      brown: colors.brown.toUpperCase(),
      gold: colors.gold.toUpperCase(),
      goldSecondary: colors.goldSecondary.toUpperCase(),
      cream: colors.cream.toUpperCase(),
    };
  }
}
