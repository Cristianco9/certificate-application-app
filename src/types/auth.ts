/** Roles recognized by the backend `rol` ENUM. */
export type UserRole =
  | 'Máster'
  | 'Auxiliar'
  | 'Administrador'
  | 'Funcionario'
  | 'Rector';

/**
 * This is exactly what the middleware signs on login and rotation:
 * `{ id, role }`. It is also what `checkRole([...])` inspects.
 */
export type AuthenticatedUser = {
  id: number;
  role: UserRole;
};

/**
 * Response of `GET /auth/me`.
 *
 * Note: unlike other authenticated endpoints, `/auth/me` does NOT return an
 * `authentication` field and does NOT wrap the user in a nested object —
 * `id` and `role` sit at the top level.
 */
export type MeSuccessResponse = {
  success: true;
  message: string;
  id: number;
  role: UserRole;
};

export type MeErrorResponse = {
  success: false;
  message: string;
  error:
    | "AUTHENTICATION_REQUIRED"
    | "TOKEN_EXPIRED"
    | "INVALID_TOKEN";
};

export type MeResponse = MeSuccessResponse | MeErrorResponse;
