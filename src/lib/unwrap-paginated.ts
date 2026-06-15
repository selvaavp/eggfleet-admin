import type { AxiosResponse } from 'axios';
import type { PaginatedResponse } from '@/types';

/** Backend envelope after ResponseTransformInterceptor: `{ success, message, data: T[], meta }` */
type ListEnvelope<T> = {
  success: boolean;
  message: string;
  data: T[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/** Normalize paginated list responses so `total` / `totalPages` are available (not only `data.data`). */
export function unwrapPaginated<T>(r: AxiosResponse<ListEnvelope<T>>): PaginatedResponse<T> {
  const body = r.data;
  const m = body.meta;
  return {
    data: Array.isArray(body.data) ? body.data : [],
    total: m?.total ?? 0,
    page: m?.page ?? 1,
    limit: m?.limit ?? 10,
    totalPages: m?.totalPages ?? 0,
  };
}
