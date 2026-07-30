import { ValidationError } from 'class-validator';
import { ValidationIssue } from '../errors/api.exception';

export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationIssue[] {
  return errors.flatMap((error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own = Object.entries(error.constraints ?? {}).map(([rule, message]) => ({
      field: path,
      rule,
      message,
    }));

    return [...own, ...flattenValidationErrors(error.children ?? [], path)];
  });
}
