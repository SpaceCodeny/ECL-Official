/**
 * Tipos compartilhados do frontend — resposta paginada e utilitários.
 */

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  timestamp?: string;
  path?: string;
  details?: Record<string, string>;
}
