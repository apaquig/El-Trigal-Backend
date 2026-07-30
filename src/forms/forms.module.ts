import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaModule } from '../media/media.module';
import { PublicFormsController, AdminCakeRequestsController } from './forms.controller';
import { FormsService } from './forms.service';
import { ContactMessage, ContactMessageSchema } from './schemas/contact-message.schema';
import { CustomCakeRequest, CustomCakeRequestSchema } from './schemas/custom-cake-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContactMessage.name, schema: ContactMessageSchema },
      { name: CustomCakeRequest.name, schema: CustomCakeRequestSchema },
    ]),
    MediaModule,
  ],
  controllers: [PublicFormsController, AdminCakeRequestsController],
  providers: [FormsService],
})
export class FormsModule {}
