export type Shift = "DIURNA" | "NOCTURNA";

export type CertificateSearchResult = {
  id: number;
  firstName: string;
  middleName: string | null;
  firstLastName: string;
  secondLastName: string | null;
  documentNumber: string | null;
  graduationYear: number | null;
  grade: string | null;
  group: string | null;
  shift: Shift | null;
};

export type CertificateSearchFilters = {
  // Required
  firstName: string;
  firstLastName: string;
  // Optional
  secondName: string;
  secondLastName: string;
  documentNumber: string;
  documentTypeId: string | null;
  lastAcademicYear: string;   // "1900".."2026"
  gradeId: string | null;     // numeric id from /grades/list-all
  group: string | null;       // "1".."10"
  birthplace: string;         // free text
  jornada: Shift | null;
};

export const EMPTY_CERTIFICATE_FILTERS: CertificateSearchFilters = {
  firstName: "",
  firstLastName: "",
  secondName: "",
  secondLastName: "",
  documentNumber: "",
  documentTypeId: null,
  lastAcademicYear: "",
  gradeId: null,
  group: null,
  birthplace: "",
  jornada: null,
};

export function hasAnyFilter(filters: CertificateSearchFilters): boolean {
  return Object.values(filters).some(
    (value) => value !== null && value !== undefined && value !== ""
  );
}

/**
 * Converts the UI filter object into a request payload by dropping every
 * field the user left at its default ("Todos" dropdown / empty text).
 *
 * Rationale: the backend treats a present-but-empty param as a literal
 * filter ("find students whose secondName is ''") rather than "ignore
 * this filter". Omitting the key entirely is the only way to say
 * "no constraint on this field".
 */
export function toSearchRequest(
  filters: CertificateSearchFilters
): Partial<CertificateSearchFilters> {
  const request: Partial<CertificateSearchFilters> = {};

  for (const [key, value] of Object.entries(filters) as Array<
    [keyof CertificateSearchFilters, CertificateSearchFilters[keyof CertificateSearchFilters]]
  >) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    // Safe cast: we already know the key and value came from the same object.
    (request as Record<string, unknown>)[key] = value;
  }

  return request;
}
