import { apiClient, assertEndpoint } from "@/services/api";

const authEndpoints = {
  login: null,
  logout: null,
  me: null,
  verifyCredentials: null,
} satisfies Record<string, string | null>;

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthenticatedUser;
};

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return apiClient.post<LoginResponse, LoginRequest>(
    assertEndpoint(authEndpoints.login, "auth.login"),
    { body: payload }
  );
}

export function logout(): Promise<void> {
  return apiClient.post<void>(assertEndpoint(authEndpoints.logout, "auth.logout"));
}

export function getCurrentUser(): Promise<AuthenticatedUser> {
  return apiClient.get<AuthenticatedUser>(
    assertEndpoint(authEndpoints.me, "auth.me")
  );
}

export function verifyCredentials(payload: LoginRequest): Promise<void> {
  return apiClient.post<void, LoginRequest>(
    assertEndpoint(
      authEndpoints.verifyCredentials,
      "auth.verifyCredentials"
    ),
    { body: payload }
  );
}
