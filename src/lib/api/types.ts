export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number | boolean)[];

export type QueryParams = Record<string, QueryValue>;

export type ApiRequestOptions<TBody = unknown> = {
  body?: TBody;
  headers?: HeadersInit;
  query?: QueryParams;
  signal?: AbortSignal;
  token?: string | null;
};

export type ApiClientConfig = {
  baseUrl: string;
  defaultHeaders?: HeadersInit;
  getAuthToken?: () => string | null | Promise<string | null>;
};

export type ApiErrorPayload = {
  message?: string;
  code?: string;
  errors?: unknown;
  details?: unknown;
};

export type ApiResponseEnvelope<TData> = {
  data: TData;
  message?: string;
};

export type PaginatedResponse<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
