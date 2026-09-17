import type { ApiErrorPayload } from "@/lib/api/types";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly payload?: ApiErrorPayload;

  constructor({
    message,
    status,
    code,
    payload,
  }: {
    message: string;
    status: number;
    code?: string;
    payload?: ApiErrorPayload;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiConfigurationError";
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export async function createApiError(response: Response): Promise<ApiError> {
  const payload = await readErrorPayload(response);
  const message =
    payload?.message ??
    response.statusText ??
    "The REST API returned an unsuccessful response.";

  return new ApiError({
    message,
    status: response.status,
    code: payload?.code,
    payload,
  });
}

async function readErrorPayload(
  response: Response
): Promise<ApiErrorPayload | undefined> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return undefined;
  }

  try {
    const payload = (await response.json()) as ApiErrorPayload;
    return payload;
  } catch {
    return undefined;
  }
}
