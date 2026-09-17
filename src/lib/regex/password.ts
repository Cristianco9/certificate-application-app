/**
 * Password pattern enforced by the backend on user creation and on
 * `POST /users/reset-password`. Mirrors the Joi schema:
 *   - at least one letter
 *   - at least one digit
 *   - only letters and digits (no symbols, no whitespace)
 *   - 8 to 80 characters
 *
 * Helper functions and human-facing strings live in `@/lib/password`.
 */
export const USER_PASSWORD_PATTERN =
  /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{8,80}$/;
