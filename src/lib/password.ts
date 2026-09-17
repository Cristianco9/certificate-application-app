import { USER_PASSWORD_PATTERN } from "./regex/password";

// Re-exported so `@/lib/password` remains the single import surface for
// everything password-related. The pattern itself is defined in
// `@/lib/regex/password` so it can be reused by schemas and non-password
// modules without pulling in password-domain helpers.
export { USER_PASSWORD_PATTERN };

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 80;

/** Short, Spanish-language hint shown under every password field. */
export const PASSWORD_REQUIREMENTS_HINT =
  `Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres,
  con al menos una letra y un número.`;
/** Longer message used when validation fails on a "new password" field. */
export const PASSWORD_REQUIREMENTS_ERROR =
  `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH}
  caracteres, incluir al menos una letra y un número, y no contener símbolos.`;

export function isValidPassword(value: string): boolean {
  return USER_PASSWORD_PATTERN.test(value);
}
