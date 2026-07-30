import { ErrorCode } from './error-code.enum';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.VALIDATION_ERROR]: 'La solicitud contiene datos invalidos.',
  [ErrorCode.UNAUTHORIZED]: 'No autenticado.',
  [ErrorCode.FORBIDDEN]: 'No tienes permiso para realizar esta accion.',
  [ErrorCode.INVALID_CREDENTIALS]: 'Correo o contrasena invalidos.',
  [ErrorCode.ACCOUNT_LOCKED]: 'La cuenta esta bloqueada temporalmente.',
  [ErrorCode.TOKEN_EXPIRED]: 'El token expiro.',
  [ErrorCode.TOKEN_INVALID]: 'El token es invalido.',
  [ErrorCode.EMAIL_ALREADY_EXISTS]: 'El correo ya esta registrado.',
  [ErrorCode.RESOURCE_NOT_FOUND]: 'Recurso no encontrado.',
  [ErrorCode.SLUG_ALREADY_EXISTS]: 'El slug ya existe.',
  [ErrorCode.SKU_ALREADY_EXISTS]: 'El SKU ya existe.',
  [ErrorCode.CATEGORY_NOT_EMPTY]: 'La categoria tiene productos asociados.',
  [ErrorCode.MEDIA_IN_USE]: 'El archivo esta en uso.',
  [ErrorCode.CONFLICT]: 'Existe un conflicto con el estado actual del recurso.',
  [ErrorCode.RATE_LIMITED]: 'Demasiadas solicitudes. Intenta nuevamente mas tarde.',
  [ErrorCode.INTERNAL_ERROR]: 'Error interno.',
};
