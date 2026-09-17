import { ApiConfigurationError, createApiError } from "@/lib/api/errors";
import type {
  ApiClientConfig,
  ApiRequestOptions,
  HttpMethod,
  QueryParams,
} from "@/lib/api/types";

const jsonContentType = "application/json";

export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders?: HeadersInit;
  private readonly getAuthToken?: ApiClientConfig["getAuthToken"];

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.defaultHeaders = config.defaultHeaders;
    this.getAuthToken = config.getAuthToken;
  }

  get<TResponse>(
    path: string,
    options?: ApiRequestOptions
  ): Promise<TResponse> {
    return this.request<TResponse>("GET", path, options);
  }

  post<TResponse, TBody = unknown>(
    path: string,
    options?: ApiRequestOptions<TBody>
  ): Promise<TResponse> {
    return this.request<TResponse, TBody>("POST", path, options);
  }

  put<TResponse, TBody = unknown>(
    path: string,
    options?: ApiRequestOptions<TBody>
  ): Promise<TResponse> {
    return this.request<TResponse, TBody>("PUT", path, options);
  }

  patch<TResponse, TBody = unknown>(
    path: string,
    options?: ApiRequestOptions<TBody>
  ): Promise<TResponse> {
    return this.request<TResponse, TBody>("PATCH", path, options);
  }

  delete<TResponse>(
    path: string,
    options?: ApiRequestOptions
  ): Promise<TResponse> {
    return this.request<TResponse>("DELETE", path, options);
  }

  private async request<TResponse, TBody = unknown>(
    method: HttpMethod,
    path: string,
    options: ApiRequestOptions<TBody> = {}
  ): Promise<TResponse> {
    const headers = new Headers(this.defaultHeaders);
    mergeHeaders(headers, options.headers);

    const token = options.token ?? (await this.getAuthToken?.());
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const body = serializeBody(options.body, headers);
    const response = await fetch(this.createUrl(path, options.query), {
      body,
      headers,
      method,
      signal: options.signal,
    });

    if (!response.ok) {
      throw await createApiError(response);
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    return (await response.json()) as TResponse;
  }

  private createUrl(path: string, query?: QueryParams): string {
    if (!this.baseUrl) {
      throw new ApiConfigurationError(
        "API base URL is not configured. Set NEXT_PUBLIC_API_URL for browser requests or API_URL for server-side requests."
      );
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);

    if (!query) {
      return url.toString();
    }

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => url.searchParams.append(key, String(entry)));
      } else {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }
}

function mergeHeaders(headers: Headers, input?: HeadersInit): void {
  if (!input) {
    return;
  }

  new Headers(input).forEach((value, key) => headers.set(key, value));
}

function serializeBody<TBody>(
  body: TBody | undefined,
  headers: Headers
): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (body instanceof FormData) {
    return body;
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", jsonContentType);
  }

  return JSON.stringify(body);
}
