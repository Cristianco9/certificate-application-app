/**
 * Account patterns — username and email.
 *
 * Mirrors the backend Joi schemas for `POST /users/create`,
 * `POST /users/update`, and `POST /users/login`.
 */

/**
 * Username: 3–30 characters, letters, digits, and the symbols `. _ -`.
 * Excludes whitespace, `@`, `+`, and everything else.
 */
export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,30}$/;

/**
 * Standard email format. Deliberately permissive — the backend is the
 * authoritative validator (guidelines.md §16, §24, §56 Rule 3).
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
