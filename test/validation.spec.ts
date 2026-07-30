import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateProductDto } from '../src/catalog/dto/product.dto';
import { NoSqlInjectionPipe } from '../src/common/pipes/no-sql-injection.pipe';
import { ContactDto } from '../src/forms/dto/forms.dto';

describe('strict request validation', () => {
  it('rejects strings for integer money fields in JSON bodies', () => {
    const dto = plainToInstance(CreateProductDto, {
      basePriceCents: '2500',
    });

    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(JSON.stringify(errors)).toContain('basePriceCents');
  });

  it('rejects unknown fields', () => {
    const dto = plainToInstance(ContactDto, {
      name: 'Maria Lopez',
      email: 'maria@example.com',
      subject: 'Pedido especial',
      message: 'Quiero informacion sobre panes para un evento.',
      locale: 'es',
      extra: true,
    });

    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some((error) => error.property === 'extra')).toBe(true);
  });

  it('rejects MongoDB operators in nested payloads', () => {
    const pipe = new NoSqlInjectionPipe();
    expect(() =>
      pipe.transform({ email: { $ne: null } }, { type: 'body', metatype: Object }),
    ).toThrow('La solicitud contiene datos invalidos.');
  });
});
