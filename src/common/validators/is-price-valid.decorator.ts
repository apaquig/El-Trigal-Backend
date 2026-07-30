import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsCompareAtGreaterOrEqual(
  basePropertyName: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      name: 'isCompareAtGreaterOrEqual',
      target: object.constructor,
      propertyName: propertyName.toString(),
      constraints: [basePropertyName],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value === null || value === undefined) {
            return true;
          }

          const [baseProperty] = args.constraints as string[];
          const base = (args.object as Record<string, unknown>)[baseProperty];

          if (base === null || base === undefined) {
            return true;
          }

          return typeof value === 'number' && typeof base === 'number' && value >= base;
        },
      },
    });
  };
}
