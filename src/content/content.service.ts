import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PublicListQueryDto, Status } from '../common/dto/shared.dto';
import { paginate } from '../common/utils/pagination';
import { Faq, FaqDocument } from './schemas/faq.schema';
import { GalleryItem, GalleryItemDocument } from './schemas/gallery-item.schema';
import { Testimonial, TestimonialDocument } from './schemas/testimonial.schema';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @InjectModel(Faq.name) private readonly faqModel: Model<FaqDocument>,
    @InjectModel(Testimonial.name) private readonly testimonialModel: Model<TestimonialDocument>,
    @InjectModel(GalleryItem.name) private readonly galleryModel: Model<GalleryItemDocument>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async listFaqs(query: PublicListQueryDto) {
    const [items, totalItems] = await Promise.all([
      this.faqModel
        .find({ status: Status.PUBLISHED })
        .sort({ sortOrder: 1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean<Faq[]>()
        .exec(),
      this.faqModel.countDocuments({ status: Status.PUBLISHED }).exec(),
    ]);

    return paginate(items, query.page, query.limit, totalItems);
  }

  async listTestimonials(query: PublicListQueryDto) {
    const [items, totalItems] = await Promise.all([
      this.testimonialModel
        .find({ status: Status.PUBLISHED })
        .sort({ sortOrder: 1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean<Testimonial[]>()
        .exec(),
      this.testimonialModel.countDocuments({ status: Status.PUBLISHED }).exec(),
    ]);

    return paginate(items, query.page, query.limit, totalItems);
  }

  async listGallery(query: PublicListQueryDto) {
    const [items, totalItems] = await Promise.all([
      this.galleryModel
        .find({ status: Status.PUBLISHED })
        .sort({ featured: -1, sortOrder: 1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean<GalleryItem[]>()
        .exec(),
      this.galleryModel.countDocuments({ status: Status.PUBLISHED }).exec(),
    ]);

    return paginate(items, query.page, query.limit, totalItems);
  }

  async getGoogleReviews(locale: string = 'es') {
    const apiKey = this.configService.get<string>('GOOGLE_PLACES_API_KEY');
    const placeId = this.configService.get<string>('GOOGLE_PLACE_ID');
    
    if (!apiKey || !placeId) {
      this.logger.warn('Faltan credenciales de Google Places en el entorno.');
      return { rating: 0, userRatingCount: 0, reviews: [] };
    }

    try {
      const languageCode = locale === 'en' ? 'en' : 'es';
      const url = `https://places.googleapis.com/v1/places/${placeId}?fields=reviews,rating,userRatingCount&languageCode=${languageCode}`;
      
      const response = await lastValueFrom(
        this.httpService.get(url, {
          headers: {
            'X-Goog-Api-Key': apiKey,
          }
        })
      );

      const data = response.data;
      
      return {
        rating: data.rating || 0,
        userRatingCount: data.userRatingCount || 0,
        reviews: data.reviews || [],
      };
    } catch (error: any) {
      this.logger.error(`Error al obtener reseñas de Google: ${error.message}`);
      return { rating: 0, userRatingCount: 0, reviews: [] };
    }
  }
}
