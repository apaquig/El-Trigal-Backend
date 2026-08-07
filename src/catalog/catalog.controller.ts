import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles.enum';
import { AdminListQueryDto, Locale } from '../common/dto/shared.dto';
import { AuthenticatedUser } from '../common/types/request-with-context';
import { CategoryService, ProductService } from './catalog.service';
import { TranslationService } from './translation.service';
import {
  CreateCategoryDto,
  PublicCategoryQueryDto,
  ReorderCategoriesDto,
  UpdateCategoryDto,
} from './dto/category.dto';
import {
  AdminProductQueryDto,
  CreateProductDto,
  PublicProductQueryDto,
  UpdateProductDto,
  GenerateSeoDto,
} from './dto/product.dto';

@ApiTags('public/categories')
@Controller('public/categories')
export class PublicCategoriesController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOkResponse({ description: 'Lista categorias publicadas.' })
  list(@Query() query: PublicCategoryQueryDto, @Req() req: any) {
    const hasPagination = 'page' in req.query || 'limit' in req.query;
    if (!hasPagination) {
      return this.categoryService.listPublicFlat(query);
    }
    return this.categoryService.listPublic(query);
  }

  @Get('with-products')
  @ApiOkResponse({ description: 'Lista categorias publicadas con sus productos embebidos.' })
  listWithProducts(
    @Query('type') type?: 'local' | 'imported',
    @Query('locale') locale?: 'es' | 'en',
  ) {
    return this.categoryService.listPublicWithProducts(type, locale || 'es');
  }

  @Get(':slug')
  @ApiOkResponse({ description: 'Categoria publicada por slug.' })
  find(
    @Param('slug') slug: string,
    @Query('locale', new DefaultValuePipe(Locale.ES)) locale: Locale,
  ) {
    return this.categoryService.findPublicBySlug(slug, locale);
  }
}

@ApiTags('public/products')
@Controller('public/products')
export class PublicProductsController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  list(@Query() query: PublicProductQueryDto) {
    return this.productService.listPublic(query);
  }

  @Get('local')
  @ApiOkResponse({ description: 'Lista productos locales publicados.' })
  listLocal(@Query() query: PublicProductQueryDto) {
    return this.productService.listPublic({ ...query, type: 'local' });
  }

  @Get('imported')
  @ApiOkResponse({ description: 'Lista productos importados publicados.' })
  listImported(@Query() query: PublicProductQueryDto) {
    return this.productService.listPublic({ ...query, type: 'imported' });
  }

  @Get('with-categories')
  @ApiOkResponse({ description: 'Lista todos los productos publicados con sus categorias completas embebidas.' })
  listWithCategories(@Query('type') type?: 'local' | 'imported') {
    return this.productService.listPublicWithCategories(type);
  }

  @Get(':slug')
  find(
    @Param('slug') slug: string,
    @Query('locale', new DefaultValuePipe(Locale.ES)) locale: Locale,
  ) {
    return this.productService.findPublicBySlug(slug, locale);
  }

  @Get(':slug/related')
  related(
    @Param('slug') slug: string,
    @Query('locale', new DefaultValuePipe(Locale.ES)) locale: Locale,
  ) {
    return this.productService.related(slug, locale);
  }
}

@ApiTags('admin/categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN, Role.EDITOR)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  list(@Query() query: AdminListQueryDto, @Req() req: any) {
    const hasPagination = 'page' in req.query || 'limit' in req.query;
    if (!hasPagination) {
      return this.categoryService.listAdminFlat();
    }
    return this.categoryService.listAdmin(query.page, query.limit);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Crea categoria.' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.categoryService.findAdmin(id);
  }

  @Patch('reorder')
  reorder(@Body() dto: ReorderCategoriesDto) {
    return this.categoryService.reorder(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Archiva categoria si no contiene productos.' })
  delete(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }
}

@ApiTags('admin/products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN, Role.EDITOR)
@Controller('admin/products')
export class AdminProductsController {
  constructor(
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
    private readonly translationService: TranslationService,
  ) {}

  @Post('generate-seo')
  async generateSeo(@Body() dto: GenerateSeoDto) {
    const category = await this.categoryService.findAdmin(dto.primaryCategoryId);
    const categoryName = category.name.es;
    const originCountry = category.origin?.country || (category.type === 'imported' ? 'Ecuador' : 'United States');

    const translatedName = await this.translationService.translateToEnglish(dto.name);
    const translatedDescription = await this.translationService.translateToEnglish(dto.description);

    const seoData = await this.translationService.generateSeoAndGeo({
      name: dto.name,
      categoryName,
      description: dto.description,
      originCountry,
      allergens: dto.allergens,
      price: dto.price,
    });

    return {
      translations: {
        en: {
          name: translatedName,
          description: translatedDescription,
        },
      },
      seo: {
        es: {
          metaTitle: seoData.es.metaTitle,
          metaDescription: seoData.es.metaDescription,
          isReviewed: false,
        },
        en: {
          metaTitle: seoData.en.metaTitle,
          metaDescription: seoData.en.metaDescription,
          isReviewed: false,
        },
      },
    };
  }

  @Get()
  list(@Query() query: AdminProductQueryDto) {
    return this.productService.listAdmin(query);
  }

  @Post()
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productService.create(dto, user);
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.productService.findAdmin(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.productService.delete(id);
  }

  @Post(':id/publish')
  @Roles(Role.OWNER, Role.ADMIN)
  publish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productService.publish(id, user);
  }

  @Post(':id/archive')
  @Roles(Role.OWNER, Role.ADMIN)
  archive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productService.archive(id, user);
  }

  @Post(':id/restore')
  @Roles(Role.OWNER, Role.ADMIN)
  restore(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productService.restore(id, user);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productService.duplicate(id, user);
  }
}

@ApiTags('dashboard')
@Controller('admin/dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminDashboardController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOkResponse({ description: 'Estadisticas del panel de administracion.' })
  getStats() {
    return this.productService.getDashboardStats();
  }
}
