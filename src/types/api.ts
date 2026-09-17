/**
 * ─────────────────────────────────────────────────────────────────────────────
 * API — Base Types
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Shared primitives used across every domain type file. These describe the
 * generic envelope every REST endpoint produced by the Express backend
 * returns, plus the helpers the API client needs.
 *
 * ID TYPES CONVENTION
 * ───────────────────
 * Entity IDs are typed as `number` in RESPONSE types because the backend
 * uses Sequelize INTEGER primary keys, which serialize as JavaScript numbers.
 *
 * IDs are typed as `string` in REQUEST types because the backend Joi schemas
 * validate them with `Joi.string().pattern(/^\d{1,10}$/)`.
 *
 * When building a request payload from an entity, convert with
 * `String(entity.id)`.
 */

/** HTTP methods supported by the API client. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Primitive values accepted as query string parameters. */
export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number | boolean)[];

/** Query string parameters for a request. */
export type QueryParams = Record<string, QueryValue>;

/**
 * Reference to a catalog entity embedded inside a response.
 *
 * Backend services replace raw foreign keys with these nested objects
 * (e.g. `municipality: { id, name }` instead of a bare `municipalityId`).
 */
export type CatalogReference = {
  id: number;
  name: string;
};

/** Base success envelope shared by every successful endpoint. */
export type ApiSuccessResponse = {
  success: true;
  message: string;
};

/**
 * Success envelope for endpoints gated behind `authAppVerifyToken`.
 *
 * The `authentication` field is the rotated JWT the middleware writes to
 * the httpOnly cookie AND exposes in the body so SPA clients can store it.
 */
export type AuthenticatedApiResponse<
  TData extends Record<string, unknown> = Record<string, never>,
> = ApiSuccessResponse & {
  authentication: string;
} & TData;

/** Error response in Boom's default shape (see `boomErrorHandler`). */
export type ApiErrorResponse = {
  statusCode: number;
  error: string;
  message: string;
};

/** Error payload that may be returned by the API (superset of Boom's shape). */
export type ApiErrorPayload = ApiErrorResponse & {
  code?: string;
  errors?: unknown;
  details?: unknown;
};

/** Options accepted by the API client methods. */
export type ApiRequestOptions<TBody = unknown> = {
  body?: TBody;
  headers?: HeadersInit;
  query?: QueryParams;
  signal?: AbortSignal;
  token?: string | null;
};

/** Configuration for creating an `ApiClient` instance. */
export type ApiClientConfig = {
  baseUrl: string;
  defaultHeaders?: HeadersInit;
  getAuthToken?: () => string | null | Promise<string | null>;
};

/**
 * Paginated response shape.
 *
 * NOTE: The current backend does not paginate any endpoint. This type is
 * provided for future use once pagination is added to the API.
 */
export type PaginatedResponse<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};