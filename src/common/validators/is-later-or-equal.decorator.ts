import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsLaterOrEqualThan(
  relatedPropertyName: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      name: 'isLaterOrEqualThan',
      target: object.constructor,
      propertyName: propertyName.toString(),
      constraints: [relatedPropertyName],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value === null || value === undefined || value === '') {
            return true;
          }

          const [relatedProperty] = args.constraints as string[];
          const relatedValue = (args.object as Record<string, unknown>)[relatedProperty];

          if (relatedValue === null || relatedValue === undefined || relatedValue === '') {
            return true;
          }

          return new Date(String(value)).getTime() >= new Date(String(relatedValue)).getTime();
        },
      },
    });
  };
}
