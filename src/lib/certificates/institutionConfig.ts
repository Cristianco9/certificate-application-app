/**
 * ─────────────────────────────────────────────────────────────────────────────
 * INSTITUTION STATIC CONFIG
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The institution's name, NIT, DANE code, address, email and phone numbers
 * all come from the API (see `fetchInstitutionForCertificateAction` in
 * `@/app/certificates/actions`).
 *
 * The values below are the pieces the `institucion` table does NOT carry
 * yet, split into two variants keyed to the scoring system the certificate
 * is issued under:
 *
 *   • MODERN — 1–5 numeric or alphabetic scores (post-2009 system).
 *     Governed by Resolución 4999 del 21 de noviembre de 2014
 *     (recognition) and Decreto 1290 del 11 Abril 2009 (evaluation).
 *
 *   • OLD — 1–10 numeric scores (pre-2000 system).
 *     Governed by Resolución No. 71 del 17 de Enero de 1977
 *     (establishment) and Resolución 2729 de 1974 (curriculum's
 *     hourly intensity). Reproduces the legal phrasing found on
 *     historical certificates from that era.
 *
 * `CertificateDocument.tsx` chooses the variant via `isOldScale(...)`.
 *
 * When these fields are added to the DB (either as columns on `institucion`
 * or as a separate `institucion_detalle` table), move them to the API and
 * delete this file. Until then, keep it in sync with what the institution
 * actually publishes.
 */
export const INSTITUTION_STATIC_CONFIG = {
  // ── Shared across both scoring systems ──────────────────────────────
  headquartersName: "SEDE Principal",
  website: "www.iensch.edu.co",
  departmentName: "Valle del Cauca",

  // ── MODERN — post-2009 system (1–5 numeric or alphabetic) ───────────
  /** Long form used in the header's middle column. */
  resolutionLineModern:
    "Reconocimiento por Resolución 4999 del 21 de noviembre de 2014",

  /** Short form used in the legal paragraph under the title. */
  resolutionShortModern: "Resolución 4999 del 21 de noviembre de 2014",

  /** Closing sentence appended to the student intro. */
  decreeLineModern: "Conforme al Decreto 1290 del 11 Abril 2009.",

  // ── OLD — pre-2000 system (1–10 numeric) ────────────────────────────
  /** Long form used in the header's middle column. */
  resolutionLineOld:
    "Aprobado por Resolución No. 71 del 17 de Enero de 1977",

  /** Short form used in the legal paragraph under the title. */
  resolutionShortOld: "Resolución No. 71 del 17 de Enero de 1977",

  /** Closing sentence appended to the student intro. */
  decreeLineOld:
    "Con la intensidad horaria indicada en la Resolución 2729 de 1974.",
} as const;
