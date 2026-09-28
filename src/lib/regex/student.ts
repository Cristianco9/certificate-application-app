/**
 * ─────────────────────────────────────────────────────────────────────────────
 * STUDENT — Search-input patterns (mirrors backend studentRegEx.js)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * These are byte-for-byte copies of the patterns the API enforces on
 * `POST /students/create` and `POST /students/update`. Keeping them
 * identical means the frontend can never accept a value the backend
 * will then reject (guidelines.md §16: backend validation is
 * authoritative, frontend validation mirrors it for UX).
 */

/** Student first name — single given name, letters only, 3–50 chars. */
export const STUDENT_FIRST_NAME_PATTERN = /^[\p{L}]{3,50}$/u;

/** Student middle name — OPTIONAL, letters only, 3–50 chars. */
export const STUDENT_MIDDLE_NAME_PATTERN = /^([\p{L}]{3,50})?$/u;

/** Student first last name — single surname, letters only, 3–50 chars. */
export const STUDENT_FIRST_LAST_NAME_PATTERN = /^[\p{L}]{3,50}$/u;

/** Student second last name — OPTIONAL, letters only, 3–50 chars. */
export const STUDENT_SECOND_LAST_NAME_PATTERN = /^([\p{L}]{3,50})?$/u;

/**
 * Birthplace as a municipality name — letters and spaces, 3–50 chars.
 * Mirrors the backend's `municipalityName` pattern, since "lugar de
 * nacimiento" resolves to a municipality on the backend.
 */
export const STUDENT_BIRTHPLACE_PATTERN = /^[\p{L} ]{3,50}$/u;
