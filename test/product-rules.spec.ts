import { BadRequestException } from '@nestjs/common';
import { ProductService } from '../src/catalog/catalog.service';
import { ProductType, Status } from '../src/common/dto/shared.dto';

describe('product business rules', () => {
  const service = new ProductService({} as never, {} as never, {} as never, {} as never);
  const assertRules = service as unknown as {
    assertProductBusinessRules(input: unknown, status: Status): void;
  };

  it('requires custom products to request quote', () => {
    expect(() =>
      assertRules.assertProductBusinessRules(
        {
          productType: ProductType.CUSTOM,
          basePriceCents: null,
          priceLabel: { es: 'Cotizacion', en: 'Quote' },
          variants: [],
          options: [],
          media: [],
          categoryIds: ['507f1f77bcf86cd799439011'],
          ordering: {
            onlineOrderingEnabled: false,
            pickupEnabled: true,
            deliveryEnabled: false,
            quoteRequired: false,
          },
        },
        Status.DRAFT,
      ),
    ).toThrow(BadRequestException);
  });

  it('requires publishable products to have primary image and ordering mode', () => {
    expect(() =>
      assertRules.assertProductBusinessRules(
        {
          productType: ProductType.SIMPLE,
          basePriceCents: 2500,
          priceLabel: null,
          variants: [],
          options: [],
          media: [],
          categoryIds: ['507f1f77bcf86cd799439011'],
          ordering: {
            onlineOrderingEnabled: false,
            pickupEnabled: false,
            deliveryEnabled: false,
            quoteRequired: false,
          },
        },
        Status.PUBLISHED,
      ),
    ).toThrow(BadRequestException);
  });
});
