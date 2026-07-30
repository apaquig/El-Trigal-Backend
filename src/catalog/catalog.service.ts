import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from '../auth/roles.enum';
import { ProductType, Status } from '../common/dto/shared.dto';
import { ApiException } from '../common/errors/api.exception';
import { ErrorCode } from '../common/errors/error-code.enum';
import { AuthenticatedUser } from '../common/types/request-with-context';
import { paginate } from '../common/utils/pagination';
import { MediaService } from '../media/media.service';
import {
  CreateCategoryDto,
  PublicCategoryQueryDto,
  ReorderCategoriesDto,
  UpdateCategoryDto,
} from './dto/category.dto';
import {
  AdminProductQueryDto,
  CreateProductDto,
  ProductOptionDto,
  PublicProductQueryDto,
  UpdateProductDto,
} from './dto/product.dto';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Product, ProductDocument } from './schemas/product.schema';
import { TranslationService, sanitizeEnglishText } from './translation.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    private readonly mediaService: MediaService,
  ) {}

  async listPublic(query: PublicCategoryQueryDto) {
    const filter: Record<string, unknown> = { status: Status.PUBLISHED };
    if (query.featured !== undefined) {
      filter.featured = query.featured;
    }
    if (query.search) {
      filter.$text = { $search: query.search };
    }

    const [items, totalItems] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort({ sortOrder: 1, [`name.${query.locale}`]: 1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean<Category[]>()
        .exec(),
      this.categoryModel.countDocuments(filter).exec(),
    ]);

    return paginate(items, query.page, query.limit, totalItems);
  }

  async findPublicBySlug(slug: string, locale: 'es' | 'en'): Promise<Category> {
    const category = await this.categoryModel
      .findOne({ status: Status.PUBLISHED, [`slug.${locale}`]: slug })
      .lean<Category>()
      .exec();

    if (!category) {
      throw new NotFoundException();
    }

    return category;
  }

  async listPublicWithProducts(type?: 'local' | 'imported') {
    const categoryFilter: Record<string, unknown> = { status: { $ne: Status.ARCHIVED } };
    if (type) {
      categoryFilter.type = type;
    }

    const categories = await this.categoryModel.find(categoryFilter).sort({ sortOrder: 1 }).lean().exec();
    const products = await this.productModel
      .find({ published: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean<Product[]>()
      .exec();

    return categories.map((cat) => {
      const catProducts = products.filter(
        (p) => String(p.primaryCategoryId) === String(cat._id) || (p.categoryIds || []).map(String).includes(String(cat._id)),
      );

      return {
        ...cat,
        id: (cat as any)._id,
        products: catProducts.map((prod) => {
          const {
            createdBy: _createdBy,
            updatedBy: _updatedBy,
            variants: _variants,
            options: _options,
            compareAtPriceCents: _compareAtPriceCents,
            preparation: _preparation,
            featured: _featured,
            bestSeller: _bestSeller,
            newProduct: _newProduct,
            primaryCategoryId: _primaryCategoryId,
            categoryIds: _categoryIds,
            shortDescription: _shortDescription,
            dietaryTags: _dietaryTags,
            availability: _availability,
            ordering: _ordering,
            priceLabel: _priceLabel,
            productType: _productType,
            ...clean
          } = prod as any;
          return {
            ...clean,
            id: (prod as any)._id,
            price: prod.basePriceCents ? prod.basePriceCents / 100 : 0,
          };
        }),
      };
    });
  }

  async listAdmin(page = 1, limit = 24) {
    const filter = { status: { $ne: Status.ARCHIVED } };
    const [items, totalItems] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<Category[]>()
        .exec(),
      this.categoryModel.countDocuments(filter).exec(),
    ]);

    const categoryIds = items.map(item => (item as any)._id);
    const productCounts = await this.productModel.aggregate([
      { $match: { categoryIds: { $in: categoryIds }, status: { $ne: Status.ARCHIVED } } },
      { $unwind: '$categoryIds' },
      { $match: { categoryIds: { $in: categoryIds } } },
      { $group: { _id: '$categoryIds', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(productCounts.map(pc => [pc._id.toString(), pc.count]));
    items.forEach((item: any) => {
      item.productCount = countMap.get(item._id.toString()) || 0;
    });

    return paginate(items, page, limit, totalItems);
  }

  async findAdmin(id: string): Promise<Category> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de categoría inválido.');
    }
    const category = await this.categoryModel.findById(id).lean<Category>().exec();
    if (!category) {
      throw new NotFoundException();
    }

    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    await this.assertParentAllowed(null, dto.parentId ?? null);
    const image = await this.resolveCategoryImage(dto.imageId);
    const category = new this.categoryModel({
      ...dto,
      parentId: dto.parentId ?? null,
      image,
      seo: dto.seo ?? {},
    });
    await category.save();

    return category.toJSON() as Category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de categoría inválido.');
    }
    const existing = await this.categoryModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException();
    }

    if (dto.parentId !== undefined) {
      await this.assertParentAllowed(id, dto.parentId);
      existing.parentId = dto.parentId ? new Types.ObjectId(dto.parentId) : null;
    }

    if (dto.imageId !== undefined) {
      existing.image = await this.resolveCategoryImage(dto.imageId);
    }

    Object.assign(existing, {
      ...(dto.name && { name: dto.name }),
      ...(dto.slug && { slug: dto.slug }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
      ...(dto.status && { status: dto.status }),
      ...(dto.type && { type: dto.type }),
      ...(dto.origin && { origin: dto.origin }),
      ...(dto.featured !== undefined && { featured: dto.featured }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.seo && { seo: dto.seo }),
    });

    await existing.save();
    return existing.toJSON() as Category;
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de categoría inválido.');
    }
    const hasProducts = await this.productModel.exists({
      categoryIds: id,
      status: { $ne: Status.ARCHIVED },
    });
    if (hasProducts) {
      throw new ApiException(
        ErrorCode.CATEGORY_NOT_EMPTY,
        'La categoria tiene productos asociados.',
        HttpStatus.CONFLICT,
      );
    }

    const result = await this.categoryModel.updateOne(
      { _id: id },
      { $set: { status: Status.ARCHIVED } },
    );
    if (result.matchedCount === 0) {
      throw new NotFoundException();
    }
  }

  async reorder(dto: ReorderCategoriesDto): Promise<{ updated: number }> {
    const updates = dto.items.map((item) =>
      this.categoryModel.updateOne({ _id: item.id }, { $set: { sortOrder: item.sortOrder } }),
    );
    const results = await Promise.all(updates);
    return { updated: results.filter((result) => result.modifiedCount > 0).length };
  }

  private async resolveCategoryImage(imageId?: string | null) {
    if (!imageId) {
      return null;
    }

    const [asset] = await this.mediaService.findByIds([imageId]);
    return this.mediaService.toEmbedded(asset);
  }

  private async assertParentAllowed(
    categoryId: string | null,
    parentId: string | null | undefined,
  ): Promise<void> {
    if (!parentId) {
      return;
    }

    if (categoryId && categoryId === parentId) {
      throw new BadRequestException('parentId no puede ser el mismo id.');
    }

    let current = await this.categoryModel
      .findById(parentId)
      .lean<Category & { _id: Types.ObjectId }>()
      .exec();
    if (!current) {
      throw new BadRequestException('parentId no existe.');
    }

    while (current?.parentId) {
      if (categoryId && String(current.parentId) === categoryId) {
        throw new BadRequestException('parentId crea un ciclo.');
      }

      current = await this.categoryModel
        .findById(current.parentId)
        .lean<Category & { _id: Types.ObjectId }>()
        .exec();
    }
  }
}

@Injectable()
export class ProductService implements OnModuleInit {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    private readonly mediaService: MediaService,
    private readonly translationService: TranslationService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      // One-time migration from status to published boolean
      await this.productModel.updateMany(
        { status: 'published', published: { $exists: false } },
        { $set: { published: true } }
      );
      await this.productModel.updateMany(
        { status: { $exists: true }, published: { $exists: false } },
        { $set: { published: false } }
      );

      // Clean up deleted fields from database
      await this.productModel.updateMany(
        {},
        {
          $unset: {
            'availability.availableDays': 1,
            variants: 1,
            options: 1,
            compareAtPriceCents: 1,
            preparation: 1,
            featured: 1,
            bestSeller: 1,
            newProduct: 1,
            shortDescription: 1,
            sku: 1,
            status: 1,
          },
        },
      );

      const allProducts = await this.productModel.find({}).exec();
      for (const prod of allProducts) {
        const nameEs = prod.name?.es || '';
        const nameEn = prod.name?.en || '';
        const hasNtildeOrAccent = /[ñÑáéíóúÁÉÍÓÚüÜ]/.test(nameEn + (prod.description?.en || '') + (prod.seo?.en?.metaTitle || ''));
        const isNameUntranslated = !nameEn || nameEn === nameEs;
        const isSeoUntranslated = !prod.seo?.en?.metaTitle || prod.seo.en.metaTitle === prod.seo?.es?.metaTitle;

        const hasBadAlt = prod.media && Array.isArray(prod.media) && prod.media.some(asset => {
          const altEs = asset.alt?.es || '';
          return !altEs || /^[a-f0-9]{12,80}$/i.test(altEs) || altEs.includes('WhatsApp') || altEs.includes('Image') || altEs.includes('ChatGPT') || altEs.includes('fa31ed27b');
        });

        const hasFewTags = !prod.tags || !Array.isArray(prod.tags) || prod.tags.length < 5;

        if (isNameUntranslated || isSeoUntranslated || hasNtildeOrAccent || hasBadAlt || hasFewTags) {
          if (hasNtildeOrAccent && !isNameUntranslated && !hasFewTags) {
            prod.name.en = sanitizeEnglishText(prod.name.en);
            if (prod.description?.en) prod.description.en = sanitizeEnglishText(prod.description.en);
            if (prod.ingredients?.en) prod.ingredients.en = sanitizeEnglishText(prod.ingredients.en);
            if (prod.seo?.en?.metaTitle) prod.seo.en.metaTitle = sanitizeEnglishText(prod.seo.en.metaTitle);
            if (prod.seo?.en?.metaDescription) prod.seo.en.metaDescription = sanitizeEnglishText(prod.seo.en.metaDescription);
          } else {
            await this.autoGenerateSeoAndTranslation(prod);
          }
          prod.markModified('name');
          prod.markModified('description');
          prod.markModified('ingredients');
          prod.markModified('slug');
          prod.markModified('seo');
          prod.markModified('translations');
          prod.markModified('media');
          prod.markModified('tags');
          await prod.save();
        }
      }
    } catch {
      // ignore
    }
  }

  async listPublic(query: PublicProductQueryDto & { type?: 'local' | 'imported' }) {
    if (query.type) {
      return this.listPublicWithProducts(query.type, query.locale ?? 'es');
    }

    const filter: Record<string, unknown> = { published: true };

    if (query.featured !== undefined) filter.featured = query.featured;
    if (query.bestSeller !== undefined) filter.bestSeller = query.bestSeller;
    if (query.newProduct !== undefined) filter.newProduct = query.newProduct;
    if (query.availability) filter['availability.status'] = query.availability;
    if (query.search) filter.$text = { $search: query.search };

    const categoriesFilter: Record<string, unknown> = { status: { $ne: Status.ARCHIVED } };
    if (query.type) categoriesFilter.type = query.type;

    const [productsRaw, totalItems, categoriesRaw] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(this.publicSort(query.sort ?? 'sortOrder', query.locale))
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean<Product[]>()
        .exec(),
      this.productModel.countDocuments(filter).exec(),
      this.categoryModel.find(categoriesFilter).sort({ sortOrder: 1 }).lean().exec(),
    ]);

    const mappedCategories = categoriesRaw.map((cat) => ({
      ...cat,
      id: cat._id.toString(),
    }));

    const mappedProducts = productsRaw.map((item) => this.toPublicProduct(item));

    const combinedItems = [...mappedCategories, ...mappedProducts];

    return paginate<any>(
      combinedItems,
      query.page,
      query.limit,
      totalItems,
    );
  }

  async findPublicBySlug(slug: string, locale: 'es' | 'en'): Promise<Partial<Product>> {
    const product = await this.productModel
      .findOne({ published: true, [`slug.${locale}`]: slug })
      .lean<Product>()
      .exec();

    if (!product) {
      throw new NotFoundException();
    }

    return this.toPublicProduct(product);
  }

  async listPublicWithCategories(type?: 'local' | 'imported') {
    const categoriesFilter: Record<string, unknown> = { status: { $ne: Status.ARCHIVED } };
    if (type) {
      categoriesFilter.type = type;
    }
    const categories = await this.categoryModel.find(categoriesFilter).lean().exec();
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));

    const productFilter: Record<string, unknown> = { published: true };
    if (type) {
      const validCategoryIds = categories.map((c) => c._id);
      productFilter.primaryCategoryId = { $in: validCategoryIds };
    }

    const products = await this.productModel
      .find(productFilter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean<Product[]>()
      .exec();

    return products.map((prod) => {
      const primaryCat = categoryMap.get(String(prod.primaryCategoryId));
      const allCats = (prod.categoryIds || [])
        .map((cid) => categoryMap.get(String(cid)))
        .filter(Boolean);

      const cleanedProd = this.toPublicProduct(prod);

      return {
        ...cleanedProd,
        id: (prod as any)._id,
        price: prod.basePriceCents ? prod.basePriceCents / 100 : 0,
        primaryCategory: primaryCat
          ? {
              id: (primaryCat as any)._id,
              name: primaryCat.name,
              slug: primaryCat.slug,
              type: primaryCat.type,
              origin: primaryCat.origin,
            }
          : null,
        categories: allCats.map((cat: any) => ({
          id: cat._id,
          name: cat.name,
          slug: cat.slug,
          type: cat.type,
        })),
      };
    });
  }

  async related(slug: string, locale: 'es' | 'en') {
    const product = await this.productModel
      .findOne({ published: true, [`slug.${locale}`]: slug })
      .lean<Product & { _id: Types.ObjectId }>()
      .exec();

    if (!product) {
      throw new NotFoundException();
    }

    const items = await this.productModel
      .find({
        _id: { $ne: product._id },
        published: true,
        categoryIds: { $in: product.categoryIds },
      })
      .sort({ featured: -1, sortOrder: 1 })
      .limit(8)
      .lean<Product[]>()
      .exec();

    return items.map((item) => this.toPublicProduct(item));
  }

  async listAdmin(query: AdminProductQueryDto) {
    const filter: Record<string, unknown> = {};
    if (query.status) {
      filter.status = query.status;
    } else {
      filter.status = { $ne: Status.ARCHIVED };
    }
    
    if (query.search) {
      filter.$or = [
        { 'name.es': { $regex: query.search, $options: 'i' } },
        { 'name.en': { $regex: query.search, $options: 'i' } }
      ];
    }

    if (query.type) {
      const categories = await this.categoryModel.find({ type: query.type, status: { $ne: Status.ARCHIVED } }).select('_id').exec();
      const categoryIds = categories.map(c => c._id);
      filter.categoryIds = { $in: categoryIds };
    }

    const [items, totalItems] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean<Product[]>()
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return paginate(items, query.page, query.limit, totalItems);
  }

  async findAdmin(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).lean<Product>().exec();
    if (!product) {
      throw new NotFoundException();
    }

    return product;
  }

  async create(dto: CreateProductDto, user: AuthenticatedUser): Promise<Product> {
    try {
      if (dto.published && user.role === Role.EDITOR) {
        throw new ForbiddenException();
      }

      await this.assertProductReferences(dto);
      this.assertProductBusinessRules(dto, dto.published ?? false);

      const product = new this.productModel({
        ...dto,
        media: (dto.media || []).map((asset) => ({
          ...asset,
          secureUrl: asset.secureUrl.replace('/upload/', '/upload/f_auto,q_auto/'),
        })),
        seo: dto.seo ?? {},
        publishedAt: dto.published ? new Date() : null,
        createdBy: new Types.ObjectId(user.sub),
        updatedBy: new Types.ObjectId(user.sub),
      });
      await this.autoGenerateSeoAndTranslation(product);
      await this.ensureUniqueSlug(product);
      await product.save();

      return product.toJSON() as Product;
    } catch (error: any) {
      console.error('--- ERROR IN PRODUCT CREATION ---');
      console.error(error);
      console.error('---------------------------------');
      try {
        const fs = require('fs');
        fs.appendFileSync('debug.log', `${new Date().toISOString()} - ${error.stack || error.message || error}\n`);
      } catch (logErr) {
        console.error('Failed to write to debug.log:', logErr);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto, user: AuthenticatedUser): Promise<Product> {
    const existing = await this.productModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException();
    }

    if (dto.published && user.role === Role.EDITOR) {
      throw new ForbiddenException();
    }

    const merged = {
      ...existing.toObject(),
      ...dto,
      categoryIds: dto.categoryIds ?? existing.categoryIds.map((value) => String(value)),
      primaryCategoryId: dto.primaryCategoryId ?? String(existing.primaryCategoryId),
      productType: dto.productType ?? existing.productType,
      ordering: dto.ordering ?? existing.ordering,
      media: dto.media ?? existing.media,
      basePriceCents:
        dto.basePriceCents !== undefined ? dto.basePriceCents : existing.basePriceCents,
      priceLabel: dto.priceLabel !== undefined ? dto.priceLabel : existing.priceLabel,
    } as CreateProductDto;

    await this.assertProductReferences(merged);
    this.assertProductBusinessRules(merged, dto.published ?? existing.published);

    Object.assign(existing, dto, {
      updatedBy: new Types.ObjectId(user.sub),
      ...(dto.published && !existing.publishedAt
        ? { publishedAt: new Date() }
        : {}),
    });

    if (dto.seo) {
      existing.markModified('seo');
    }
    if (dto.translations) {
      existing.markModified('translations');
    }

    await this.autoGenerateSeoAndTranslation(existing);
    await existing.save();
    return existing.toJSON() as Product;
  }

  async delete(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException();
    }
  }

  async publish(id: string, user: AuthenticatedUser): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException();
    }

    const dto = product.toObject() as unknown as CreateProductDto;
    this.assertProductBusinessRules(dto, true);
    product.published = true;
    product.publishedAt = product.publishedAt ?? new Date();
    product.updatedBy = new Types.ObjectId(user.sub);
    await product.save();
    return product.toJSON() as Product;
  }

  async archive(id: string, user: AuthenticatedUser): Promise<Product> {
    return this.setPublished(id, false, user);
  }

  async restore(id: string, user: AuthenticatedUser): Promise<Product> {
    return this.setPublished(id, false, user);
  }

  async duplicate(id: string, user: AuthenticatedUser): Promise<Product> {
    const product = await this.productModel.findById(id).lean<Product>().exec();
    if (!product) {
      throw new NotFoundException();
    }

    const duplicatePayload = {
      ...product,
      _id: undefined,
      slug: {
        es: `${product.slug.es}-copia-${Date.now()}`,
        en: `${product.slug.en}-copy-${Date.now()}`,
      },
      published: false,
      publishedAt: null,
      createdBy: new Types.ObjectId(user.sub),
      updatedBy: new Types.ObjectId(user.sub),
      createdAt: undefined,
      updatedAt: undefined,
    };
    const created = new this.productModel(duplicatePayload);
    await created.save();

    return created.toJSON() as Product;
  }

  private async setPublished(id: string, published: boolean, user: AuthenticatedUser): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException();
    }

    product.published = published;
    product.updatedBy = new Types.ObjectId(user.sub);
    await product.save();
    return product.toJSON() as Product;
  }

  private async assertProductReferences(dto: CreateProductDto): Promise<void> {
    if (!dto.categoryIds.includes(dto.primaryCategoryId)) {
      throw new BadRequestException('categoryIds debe incluir primaryCategoryId.');
    }

    const categoryCount = await this.categoryModel
      .countDocuments({ _id: { $in: dto.categoryIds } })
      .exec();
    if (categoryCount !== new Set(dto.categoryIds).size) {
      throw new BadRequestException('Una o mas categorias no existen.');
    }

    await this.mediaService.findByIds((dto.media || []).map((asset) => asset.id));
  }

  private assertProductBusinessRules(dto: CreateProductDto, targetPublished: boolean): void {
    if ((dto.media || []).filter((asset) => asset.isPrimary).length > 1) {
      throw new BadRequestException('media permite maximo una imagen primaria.');
    }

    if (dto.productType === ProductType.SIMPLE && dto.basePriceCents === null && !dto.priceLabel && dto.type !== 'imported') {
      throw new BadRequestException('Producto simple requiere basePriceCents o priceLabel.');
    }

    if (
      dto.productType === ProductType.VARIABLE &&
      !(dto.variants || []).some((variant) => variant.available)
    ) {
      throw new BadRequestException('Producto variable requiere al menos una variante disponible.');
    }

    if (dto.productType === ProductType.CUSTOM && !dto.ordering?.quoteRequired) {
      throw new BadRequestException('Producto custom requiere ordering.quoteRequired=true.');
    }

    this.assertOptionsDoNotCreateNegativePrice(dto.basePriceCents, dto.variants || [], dto.options || []);

    if (targetPublished) {
      this.assertPublishable(dto);
    }
  }

  private assertPublishable(dto: CreateProductDto): void {
    const hasPrimaryMediaWithAlt = dto.media && dto.media.length > 0
      ? dto.media.some(
          (asset) =>
            asset.isPrimary &&
            asset.resourceType === 'image' &&
            asset.alt?.es?.trim().length >= 2 &&
            asset.alt?.en?.trim().length >= 2,
        )
      : true;

    const hasOrdering = dto.ordering
      ? dto.ordering.onlineOrderingEnabled ||
        dto.ordering.pickupEnabled ||
        dto.ordering.deliveryEnabled
      : true;

    const hasCategory = dto.categoryIds && dto.categoryIds.length > 0;

    if (!hasPrimaryMediaWithAlt || !hasOrdering || !hasCategory) {
      throw new BadRequestException(
        'Para publicar se requiere categoria, imagen primaria con alt ES/EN y modalidad de pedido activa.',
      );
    }
  }

  private assertOptionsDoNotCreateNegativePrice(
    basePriceCents: number | null | undefined,
    variants: Array<{ priceCents: number }>,
    options: ProductOptionDto[],
  ): void {
    for (const option of options) {
      for (const value of option.values) {
        if (
          basePriceCents !== null &&
          basePriceCents !== undefined &&
          basePriceCents + value.priceModifierCents < 0
        ) {
          throw new BadRequestException('Un modificador produce precio base negativo.');
        }

        for (const variant of variants) {
          if (variant.priceCents + value.priceModifierCents < 0) {
            throw new BadRequestException('Un modificador produce precio de variante negativo.');
          }
        }
      }
    }
  }

  private publicSort(
    sort: PublicProductQueryDto['sort'],
    locale: 'es' | 'en',
  ): Record<string, 1 | -1> {
    switch (sort) {
      case 'name':
        return { [`name.${locale}`]: 1 };
      case 'price-asc':
        return { basePriceCents: 1, sortOrder: 1 };
      case 'price-desc':
        return { basePriceCents: -1, sortOrder: 1 };
      case 'newest':
        return { publishedAt: -1, createdAt: -1 };
      case 'sortOrder':
      default:
        return { primaryCategoryId: 1, sortOrder: 1, createdAt: -1 };
    }
  }

  private async listPublicWithProducts(type?: 'local' | 'imported', locale: 'es' | 'en' = 'es') {
    const categoryFilter: Record<string, unknown> = { status: Status.PUBLISHED };
    if (type) {
      categoryFilter.type = type;
    }

    const categories = await this.categoryModel.find(categoryFilter).sort({ sortOrder: 1 }).lean().exec();
    const productFilter: Record<string, any> = { published: true };
    if (type) {
      productFilter.type = type;
    }

    const products = await this.productModel
      .find(productFilter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean<Product[]>()
      .exec();

    return categories.map((cat) => {
      const catProducts = products.filter(
        (p) => String(p.primaryCategoryId) === String(cat._id) || (p.categoryIds || []).map(String).includes(String(cat._id)),
      );

      const getCategoryName = (c: any) => {
        if (!c.name) return '';
        if (typeof c.name === 'string') return c.name;
        return c.name[locale] || c.name['es'] || '';
      };

      const getCategorySlug = (c: any) => {
        if (!c.slug) return '';
        if (typeof c.slug === 'string') return c.slug;
        return c.slug[locale] || c.slug['es'] || '';
      };

      return {
        categoryId: cat._id.toString(),
        categoryName: cat.name || { es: '', en: '' },
        categorySlug: cat.slug || { es: '', en: '' },
        categorySlugs: cat.slug || { es: '', en: '' },
        categoryOrigin: cat.origin || {},
        sortOrder: cat.sortOrder || 0,
        products: catProducts.map((prod) => {
          return {
            productId: (prod as any)._id.toString(),
            productName: prod.name || { es: '', en: '' },
            productSlug: prod.slug || { es: '', en: '' },
            productDescription: prod.description || { es: '', en: '' },
            productPrice: prod.basePriceCents ? prod.basePriceCents / 100 : 0,
            productImage: prod.media && prod.media.find((m: any) => m.isPrimary)?.secureUrl || prod.media?.[0]?.secureUrl || null,
            productIngredients: prod.ingredients || { es: '', en: '' },
            productAllergens: (() => {
              const allergensMap: Record<string, string> = {
                'gluten': 'Gluten',
                'lactosa': 'Lactose',
                'leche': 'Milk',
                'huevo': 'Egg',
                'nueces': 'Tree Nuts',
                'mani': 'Peanuts',
                'soya': 'Soy',
              };
              const es = prod.allergens || [];
              const en = es.map((a: string) => allergensMap[a.toLowerCase()] || a);
              return { es, en };
            })(),
            productSeo: prod.seo ? {
              es: {
                metaTitle: prod.seo.es?.metaTitle || '',
                metaDescription: prod.seo.es?.metaDescription || '',
              },
              en: {
                metaTitle: prod.seo.en?.metaTitle || '',
                metaDescription: prod.seo.en?.metaDescription || '',
              },
            } : { es: { metaTitle: '', metaDescription: '' }, en: { metaTitle: '', metaDescription: '' } },
            sortOrder: prod.sortOrder || 0,
          };
        }),
      };
    });
  }

  private toPublicProduct(product: any): Partial<Product> {
    const {
      createdBy: _createdBy,
      updatedBy: _updatedBy,
      variants: _variants,
      options: _options,
      compareAtPriceCents: _compareAtPriceCents,
      preparation: _preparation,
      featured: _featured,
      bestSeller: _bestSeller,
      newProduct: _newProduct,
      primaryCategoryId: _primaryCategoryId,
      categoryIds: _categoryIds,
      shortDescription: _shortDescription,
      dietaryTags: _dietaryTags,
      availability: _availability,
      ordering: _ordering,
      priceLabel: _priceLabel,
      productType: _productType,
      ...publicProduct
    } = product;

    return {
      ...publicProduct,
      published: product.published,
    };
  }

  private async autoGenerateSeoAndTranslation(product: any): Promise<void> {
    if (!product.name) product.name = { es: '', en: '' };
    if (!product.description) product.description = { es: '', en: '' };
    if (!product.slug) product.slug = { es: '', en: '' };

    const nameEs = product.name?.es || '';
    const descEs = product.description?.es || '';

    // Translate product name, description to English if empty or identical to Spanish
    if (!product.name.en || product.name.en === nameEs) {
      product.name.en = await this.translationService.translateToEnglish(nameEs);
    }
    if (!product.description.en || product.description.en === descEs) {
      product.description.en = await this.translationService.translateToEnglish(descEs);
    }
    if (product.ingredients && (product.ingredients.es?.trim() || product.ingredients.en?.trim())) {
      const ingEs = product.ingredients.es?.trim() || '';
      if (ingEs && (!product.ingredients.en?.trim() || product.ingredients.en === ingEs)) {
        product.ingredients.en = await this.translationService.translateToEnglish(ingEs);
      }
    } else {
      product.ingredients = null;
    }

    // Sync translations object
    if (!product.translations) product.translations = {};
    if (!product.translations.en) product.translations.en = {};
    product.translations.en.name = product.name.en;
    product.translations.en.description = product.description.en;

    // Generate English slug
    if (!product.slug.en || product.slug.en === product.slug.es) {
      const slugBaseEn = product.name.en.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      product.slug.en = slugBaseEn || product.slug.es;
    }

    // Auto-correct image alt texts using the translated product names if they are invalid (e.g. raw filenames)
    if (product.media && Array.isArray(product.media)) {
      for (const asset of product.media) {
        const isRawFilename = !asset.alt?.es || /^[a-f0-9]{12,80}$/i.test(asset.alt.es) || asset.alt.es.includes('WhatsApp') || asset.alt.es.includes('Image') || asset.alt.es.includes('ChatGPT') || asset.alt.es.includes('fa31ed27b');
        if (isRawFilename) {
          asset.alt = {
            es: product.name.es,
            en: product.name.en
          };
        }
      }
    }

    const category = await this.categoryModel.findById(product.primaryCategoryId).exec();
    const categoryName = category ? category.name.es : '';
    const originCountry = category?.origin?.country || (category?.type === 'imported' ? 'Ecuador' : 'United States');

    // Auto-generate tags if missing or empty
    if (!product.tags || !Array.isArray(product.tags) || product.tags.length < 5) {
      product.tags = this.translationService.generateTags({
        name: nameEs,
        categoryName,
        description: descEs,
        allergens: product.allergens || []
      });
    }

    const generated = await this.translationService.generateSeoAndGeo({
      name: nameEs,
      categoryName,
      description: descEs,
      originCountry,
      allergens: product.allergens || [],
      price: product.basePriceCents ? product.basePriceCents / 100 : undefined
    });

    if (!product.seo) product.seo = {};
    if (!product.seo.es) product.seo.es = { metaTitle: null, metaDescription: null, isReviewed: false };
    if (!product.seo.en) product.seo.en = { metaTitle: null, metaDescription: null, isReviewed: false };

    const isEsSeoEmpty = !product.seo.es.metaTitle || product.seo.es.metaTitle.trim() === '';
    const isEnSeoUntranslated = !product.seo.en.metaTitle || product.seo.en.metaTitle.trim() === '' || product.seo.en.metaTitle === product.seo.es.metaTitle;

    if (isEsSeoEmpty) {
      product.seo.es.metaTitle = generated.es.metaTitle;
      product.seo.es.metaDescription = generated.es.metaDescription;
    }
    if (isEnSeoUntranslated) {
      product.seo.en.metaTitle = generated.en.metaTitle;
      product.seo.en.metaDescription = generated.en.metaDescription;
    }
  }

  private async ensureUniqueSlug(product: any): Promise<void> {
    if (!product.slug) return;
    const currentId = product._id ? product._id : null;

    if (product.slug.es) {
      const baseEs = product.slug.es;
      let slugEs = baseEs;
      let count = 1;
      while (await this.productModel.exists({ 'slug.es': slugEs, _id: { $ne: currentId } })) {
        slugEs = `${baseEs}-${count++}`;
      }
      product.slug.es = slugEs;
    }

    if (product.slug.en) {
      const baseEn = product.slug.en;
      let slugEn = baseEn;
      let count = 1;
      while (await this.productModel.exists({ 'slug.en': slugEn, _id: { $ne: currentId } })) {
        slugEn = `${baseEn}-${count++}`;
      }
      product.slug.en = slugEn;
    }
  }
}
