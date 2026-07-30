import { PaginatedResult } from '../interceptors/envelope.interceptor';

export function toTotalPages(totalItems: number, limit: number): number {
  return Math.max(1, Math.ceil(totalItems / limit));
}

export function paginate<T>(
  items: T[],
  page: number,
  limit: number,
  totalItems: number,
): PaginatedResult<T> {
  return {
    items,
    page,
    limit,
    totalItems,
    totalPages: toTotalPages(totalItems, limit),
  };
}
