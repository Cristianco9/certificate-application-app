import { ApiClient } from "@/lib/api/client";
import { ApiConfigurationError } from "@/lib/api/errors";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "";

export const apiClient = new ApiClient({
  baseUrl: apiBaseUrl,
  defaultHeaders: {
    Accept: "application/json",
  },
});

export function assertEndpoint(
  endpoint: string | null,
  serviceName: string
): string {
  if (!endpoint) {
    throw new ApiConfigurationError(
      `${serviceName} endpoint is not configured because the backend REST contract has not been confirmed yet.`
    );
  }

  return endpoint;
}

export { ApiClient };
export { ApiConfigurationError, ApiError, isApiError } from "@/lib/api/errors";
export type {
  ApiErrorPayload,
  ApiRequestOptions,
  ApiResponseEnvelope,
  PaginatedResponse,
  QueryParams,
} from "@/lib/api/types";
