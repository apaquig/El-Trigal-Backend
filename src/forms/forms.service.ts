import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { paginate } from '../common/utils/pagination';
import { MediaService } from '../media/media.service';
import {
  AdminCakeRequestQueryDto,
  ContactDto,
  CustomCakeRequestDto,
  UpdateCakeRequestDto,
} from './dto/forms.dto';
import { ContactMessage, ContactMessageDocument } from './schemas/contact-message.schema';
import { CustomCakeRequest, CustomCakeRequestDocument } from './schemas/custom-cake-request.schema';

@Injectable()
export class FormsService {
  constructor(
    @InjectModel(ContactMessage.name) private readonly contactModel: Model<ContactMessageDocument>,
    @InjectModel(CustomCakeRequest.name)
    private readonly cakeModel: Model<CustomCakeRequestDocument>,
    private readonly mediaService: MediaService,
  ) {}

  async submitContact(dto: ContactDto): Promise<{ id: string; message: string }> {
    const { honeypot: _honeypot, ...payload } = dto;
    const message = new this.contactModel({
      ...payload,
      phone: dto.phone ?? null,
    });
    await message.save();

    return {
      id: String(message._id),
      message: 'Mensaje recibido.',
    };
  }

  async submitCakeRequest(dto: CustomCakeRequestDto): Promise<{ id: string; message: string }> {
    this.assertEventDate(dto.eventDate);
    const assets = dto.imageIds?.length ? await this.mediaService.findByIds(dto.imageIds) : [];
    const { imageIds: _imageIds, honeypot: _honeypot, consent: _consent, ...payload } = dto;
    const cake = new this.cakeModel({
      ...payload,
      eventDate: new Date(`${dto.eventDate}T00:00:00.000Z`),
      budgetCents: dto.budgetCents ?? null,
      message: dto.message ?? null,
      images: assets.map((asset) => this.mediaService.toEmbedded(asset)),
    });
    await cake.save();

    return {
      id: String(cake._id),
      message: 'Solicitud recibida.',
    };
  }

  async listCakeRequests(query: AdminCakeRequestQueryDto) {
    const filter: Record<string, unknown> = {};
    if (query.status) {
      filter.status = query.status;
    }

    const [items, totalItems] = await Promise.all([
      this.cakeModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean<CustomCakeRequest[]>()
        .exec(),
      this.cakeModel.countDocuments(filter).exec(),
    ]);

    return paginate(items, query.page, query.limit, totalItems);
  }

  async findCakeRequest(id: string): Promise<CustomCakeRequest> {
    const request = await this.cakeModel.findById(id).lean<CustomCakeRequest>().exec();
    if (!request) {
      throw new NotFoundException();
    }

    return request;
  }

  async updateCakeRequest(id: string, dto: UpdateCakeRequestDto): Promise<CustomCakeRequest> {
    const request = await this.cakeModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .lean<CustomCakeRequest>()
      .exec();

    if (!request) {
      throw new NotFoundException();
    }

    return request;
  }

  private assertEventDate(value: string): void {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const eventDate = new Date(`${value}T00:00:00.000Z`);
    const maxDate = new Date(today.getTime() + 730 * 86_400_000);

    if (eventDate < today || eventDate > maxDate) {
      throw new BadRequestException('eventDate debe estar entre hoy y 730 dias.');
    }
  }
}
