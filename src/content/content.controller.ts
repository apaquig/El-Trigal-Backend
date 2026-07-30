import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PublicListQueryDto } from '../common/dto/shared.dto';
import { ContentService } from './content.service';

@ApiTags('public/content')
@Controller('public')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('faqs')
  @ApiOkResponse({ description: 'FAQs publicadas.' })
  faqs(@Query() query: PublicListQueryDto) {
    return this.contentService.listFaqs(query);
  }

  @Get('testimonials')
  @ApiOkResponse({ description: 'Testimonios publicados.' })
  testimonials(@Query() query: PublicListQueryDto) {
    return this.contentService.listTestimonials(query);
  }

  @Get('gallery')
  @ApiOkResponse({ description: 'Galeria publicada.' })
  gallery(@Query() query: PublicListQueryDto) {
    return this.contentService.listGallery(query);
  }
}
