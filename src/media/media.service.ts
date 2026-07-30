import { BadRequestException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Model, Types } from 'mongoose';
import { AppConfig } from '../config/configuration';
import { Category, CategoryDocument } from '../catalog/schemas/category.schema';
import { Product, ProductDocument } from '../catalog/schemas/product.schema';
import { ApiException } from '../common/errors/api.exception';
import { ErrorCode } from '../common/errors/error-code.enum';
import { AuthenticatedUser } from '../common/types/request-with-context';
import { ConfirmMediaDto, CreateUploadSignatureDto } from './dto/media.dto';
import { MediaAsset, MediaAssetDocument, MediaFolder } from './schemas/media-asset.schema';

const IMAGE_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif']);
const VIDEO_FORMATS = new Set(['mp4', 'webm']);
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(MediaAsset.name) private readonly mediaModel: Model<MediaAssetDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    cloudinary.config({
      cloud_name: this.config.get('cloudinary.cloudName', { infer: true }),
      api_key: this.config.get('cloudinary.apiKey', { infer: true }),
      api_secret: this.config.get('cloudinary.apiSecret', { infer: true }),
      secure: true,
    });
  }

  createUploadSignature(dto: CreateUploadSignatureDto) {
    const timestamp = Math.floor(Date.now() / 1000);
    const params = {
      timestamp,
      folder: dto.folder,
      overwrite: false,
      use_filename: true,
      unique_filename: true,
    };

    const signature = cloudinary.utils.api_sign_request(
      params,
      this.config.get('cloudinary.apiSecret', { infer: true }),
    );

    return {
      cloudName: this.config.get('cloudinary.cloudName', { infer: true }),
      apiKey: this.config.get('cloudinary.apiKey', { infer: true }),
      timestamp,
      folder: dto.folder,
      resourceType: dto.resourceType,
      signature,
    };
  }

  async confirm(dto: ConfirmMediaDto, user: AuthenticatedUser): Promise<MediaAsset> {
    this.validateCloudinaryAsset(dto);

    const temporaryExpiresAt =
      dto.folder === MediaFolder.TEMPORARY ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    const asset = await this.mediaModel
      .findOneAndUpdate(
        { publicId: dto.publicId },
        {
          $set: {
            ...dto,
            format: dto.format.toLowerCase(),
            confirmed: true,
            createdBy: new Types.ObjectId(user.sub),
            temporaryExpiresAt,
          },
        },
        { upsert: true, new: true },
      )
      .lean<MediaAsset>()
      .exec();

    if (!asset) {
      throw new BadRequestException('No se pudo confirmar el media asset.');
    }

    return asset;
  }

  async findByIds(
    ids: string[],
  ): Promise<Array<MediaAsset & { _id: Types.ObjectId; id?: string }>> {
    if (ids.length === 0) {
      return [];
    }

    const assets = await this.mediaModel
      .find({ _id: { $in: ids }, confirmed: true })
      .sort({ sortOrder: 1 })
      .lean<Array<MediaAsset & { _id: Types.ObjectId; id?: string }>>()
      .exec();

    if (assets.length !== ids.length) {
      throw new BadRequestException('Uno o mas media assets no existen o no estan confirmados.');
    }

    return assets;
  }

  async delete(id: string): Promise<void> {
    const asset = await this.mediaModel.findById(id).exec();
    if (!asset) {
      throw new NotFoundException();
    }

    const [productUse, categoryUse] = await Promise.all([
      this.productModel.exists({ 'media.id': id }),
      this.categoryModel.exists({ 'image.id': id }),
    ]);

    if (productUse || categoryUse) {
      throw new ApiException(
        ErrorCode.MEDIA_IN_USE,
        'El archivo esta en uso.',
        HttpStatus.CONFLICT,
      );
    }

    await cloudinary.uploader.destroy(asset.publicId, {
      resource_type: asset.resourceType,
      invalidate: true,
    });
    await asset.deleteOne();
  }

  toEmbedded(asset: MediaAsset & { _id?: Types.ObjectId; id?: string }) {
    return {
      id: asset.id ?? String((asset as MediaAsset & { _id: Types.ObjectId })._id),
      publicId: asset.publicId,
      secureUrl: this.deliveryUrl(asset.secureUrl),
      resourceType: asset.resourceType,
      format: asset.format,
      width: asset.width,
      height: asset.height,
      bytes: asset.bytes,
      alt: asset.alt,
      caption: asset.caption,
      isPrimary: asset.isPrimary,
      sortOrder: asset.sortOrder,
    };
  }

  private validateCloudinaryAsset(dto: ConfirmMediaDto): void {
    const cloudName = this.config.get('cloudinary.cloudName', { infer: true });
    const allowedPrefix = this.config.get('cloudinary.allowedPrefix', { infer: true });
    const expectedBase = `https://res.cloudinary.com/${cloudName}/`;

    if (
      !dto.publicId.startsWith(allowedPrefix) ||
      !Object.values(MediaFolder).some((folder) => dto.publicId.startsWith(folder))
    ) {
      throw new ApiException(
        ErrorCode.VALIDATION_ERROR,
        'publicId fuera de carpeta permitida.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!dto.secureUrl.startsWith(expectedBase)) {
      throw new ApiException(
        ErrorCode.VALIDATION_ERROR,
        `secureUrl no pertenece a la cuenta Cloudinary configurada (${cloudName}).`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const format = dto.format.toLowerCase();
    if (dto.resourceType === 'image') {
      if (!IMAGE_FORMATS.has(format)) {
        throw new ApiException(
          ErrorCode.VALIDATION_ERROR,
          'Formato de imagen no permitido.',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (dto.bytes > IMAGE_MAX_BYTES || dto.width < 10 || dto.height < 10) {
        throw new ApiException(
          ErrorCode.VALIDATION_ERROR,
          'La imagen no cumple tamaño, peso (máx 10MB) o dimensiones requeridas.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (dto.resourceType === 'video') {
      if (!VIDEO_FORMATS.has(format)) {
        throw new ApiException(
          ErrorCode.VALIDATION_ERROR,
          'Formato de video no permitido.',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (dto.bytes > this.config.get('cloudinary.videoMaxBytes', { infer: true })) {
        throw new ApiException(
          ErrorCode.VALIDATION_ERROR,
          'El video supera el peso permitido.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  private deliveryUrl(url: string): string {
    return url.replace('/upload/', '/upload/f_auto,q_auto/');
  }
}
