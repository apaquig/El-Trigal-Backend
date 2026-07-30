import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PublicListQueryDto, Status } from '../common/dto/shared.dto';
import { paginate } from '../common/utils/pagination';
import { Faq, FaqDocument } from './schemas/faq.schema';
import { GalleryItem, GalleryItemDocument } from './schemas/gallery-item.schema';
import { Testimonial, TestimonialDocument } from './schemas/testimonial.schema';

@Injectable()
export class ContentService {
  constructor(
    @InjectModel(Faq.name) private readonly faqModel: Model<FaqDocument>,
    @InjectModel(Testimonial.name) private readonly testimonialModel: Model<TestimonialDocument>,
    @InjectModel(GalleryItem.name) private readonly galleryModel: Model<GalleryItemDocument>,
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
}
