import { ArgumentMetadata, HttpStatus, Injectable, PipeTransform } from '@nestjs/common';
import { ApiException } from '../errors/api.exception';
import { ErrorCode } from '../errors/error-code.enum';

@Injectable()
export class NoSqlInjectionPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type === 'custom') {
      return value;
    }

    if (this.containsMongoOperator(value)) {
      throw new ApiException(
        ErrorCode.VALIDATION_ERROR,
        'La solicitud contiene datos invalidos.',
        HttpStatus.BAD_REQUEST,
        [
          {
            field: metadata.data ?? metadata.type,
            rule: 'noMongoOperators',
            message: 'No se permiten operadores de MongoDB en la solicitud.',
          },
        ],
      );
    }

    return value;
  }

  private containsMongoOperator(value: unknown): boolean {
    if (Array.isArray(value)) {
      return value.some((item) => this.containsMongoOperator(item));
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
        return key.startsWith('$') || this.containsMongoOperator(nested);
      });
    }

    return false;
  }
}
