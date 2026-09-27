export type UserRole =
  | "Máster"
  | "Auxiliar"
  | "Administrador"
  | "Funcionario"
  | "Rector";

export type AuthenticatedUser = {
  id: number;
  role: UserRole;
};

export type JwtPayload = {
  id: number;
  role: UserRole;
  exp: number;
  iat?: number;
};

export type LoginResponse = {
  success: true;
  message: string;
  authentication: string;
};

export type AuthErrorResponse = {
  success: false;
  message: string;
  error:
  | "AUTHENTICATION_REQUIRED"
  | "TOKEN_EXPIRED"
  | "INVALID_TOKEN"
  | "INVALID_CREDENTIALS"
  | "USER_INACTIVE";
};

export type MeResponse =
  | {
    success: true;
    message: string;
    id: number;
    role: UserRole;
  }
  | AuthErrorResponse;
