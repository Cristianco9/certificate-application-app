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
 * Student birth date — ISO 8601 `YYYY-MM-DD`, year restricted to
 * 1900–2099, month to 01–12, day to 01–31.
 *
 * Mirrors the backend's `studentBirthDate` RegEx. Like the backend
 * pattern, a RegEx alone cannot verify real calendar validity
 * (e.g. it accepts `2023-02-31`); the HTML `input[type="date"]` used
 * in the filter dialog only ever produces valid dates, so this is a
 * defensive format check, not the primary guarantee.
 */
export const STUDENT_BIRTH_DATE_PATTERN =
  /^(19\d{2}|20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
