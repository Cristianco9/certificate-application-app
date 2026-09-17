import { apiClient, assertEndpoint, type PaginatedResponse } from "@/services/api";

const userEndpoints = {
  list: null,
  detail: null,
  create: null,
  update: null,
} satisfies Record<string, string | null>;

export type UserRole = "academic_secretary" | "administrator" | "rector";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  documentNumber: string | null;
  role: UserRole;
};

export type CreateUserRequest = {
  name: string;
  email: string;
  documentType: string;
  documentNumber: string;
  role: UserRole;
  password: string;
};

export function listUsers(): Promise<PaginatedResponse<UserSummary>> {
  return apiClient.get<PaginatedResponse<UserSummary>>(
    assertEndpoint(userEndpoints.list, "users.list")
  );
}

export function getUser(userId: string): Promise<UserSummary> {
  return apiClient.get<UserSummary>(
    assertEndpoint(userEndpoints.detail, "users.detail").replace(
      ":userId",
      userId
    )
  );
}

export function createUser(payload: CreateUserRequest): Promise<UserSummary> {
  return apiClient.post<UserSummary, CreateUserRequest>(
    assertEndpoint(userEndpoints.create, "users.create"),
    { body: payload }
  );
}

export function updateUser(
  userId: string,
  payload: Partial<CreateUserRequest>
): Promise<UserSummary> {
  return apiClient.patch<UserSummary, Partial<CreateUserRequest>>(
    assertEndpoint(userEndpoints.update, "users.update").replace(
      ":userId",
      userId
    ),
    { body: payload }
  );
}
