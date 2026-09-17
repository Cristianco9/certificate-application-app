/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTH — Authentication & Session Types
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Mirrors the auth pipeline implemented by:
 *   - `src/controllers/user/login.js`
 *   - `src/controllers/user/resetPassword.js`
 *   - `src/middlewares/tokenHandlers/authAppTokenHandler.js`
 *   - `src/middlewares/checkRoleHandler.js`
 *   - `src/utils/auth/tokenSign.js` / `tokenVerify.js`
 */

/** Roles recognized by the backend `rol` ENUM. */
export type UserRole =
  | 'Máster'
  | 'Auxiliar'
  | 'Administrador'
  | 'Funcionario'
  | 'Rector';

/** Credentials submitted to `POST /users/login`. */
export type LoginCredentials = {
  username: string;
  password: string;
};

/** Request body for `POST /users/login`. */
export type LoginRequest = {
  credentials: LoginCredentials;
};

/**
 * Success body for `POST /users/login`.
 *
 * The JWT is stored in an httpOnly cookie — it is NOT part of the response
 * body. Only a success flag and a human-readable message come back.
 */
export type LoginResponse = {
  success: true;
  message: string;
};

/**
 * Error body specific to the login endpoint.
 *
 * The backend deliberately returns the SAME message for "user not found"
 * and "wrong password" to prevent user enumeration.
 */
export type LoginErrorResponse = {
  success: false;
  message: string;
  error:
  | 'INVALID_CREDENTIALS'
  | 'AUTHENTICATION_ERROR'
  | 'INTERNAL_SERVER_ERROR';
};

/**
 * Decoded JWT payload set by `authAppVerifyToken` on `req.user`.
 *
 * This is exactly what the middleware signs on login and rotation:
 * `{ id, role }`. It is also what `checkRole([...])` inspects.
 */
export type AuthenticatedUser = {
  id: number;
  role: UserRole;
};

/** Request body for `POST /users/reset-password`. */
export type ResetPasswordRequest = {
  email: string;
  documentNumber: string;
  newPassword: string;
};

/** Success body for `POST /users/reset-password` (no token is issued). */
export type ResetPasswordResponse = {
  success: true;
  message: string;
};

/**
 * Discriminated union of every possible response of `POST /users/login`.
 * Use this when you want exhaustive handling of success and failure.
 */
export type LoginResult = LoginResponse | LoginErrorResponse;
