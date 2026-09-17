/**
 * Identity patterns — entity IDs and identity document numbers.
 *
 * The backend Joi schemas validate both with `/^\d{1,10}$/`
 * (see `src/types/api.ts` for the response/request ID convention).
 */

/** Backend Joi ID pattern: digit string, 1–10 digits. */
export const ID_PATTERN = /^\d{1,10}$/;

/**
 * Identity document number. Same shape as `ID_PATTERN` today; kept as a
 * separate constant so it can diverge (e.g. alphanumeric passports) without
 * affecting entity IDs.
 */
export const DOCUMENT_NUMBER_PATTERN = /^\d{1,10}$/;
