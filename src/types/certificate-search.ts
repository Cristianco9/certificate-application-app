export type Shift = "Diurna" | "Nocturna";

// ── Filters ─────────────────────────────────────────────────────────────────

export type CertificateSearchFilters = {
  // Required
  firstName: string;
  firstLastName: string;
  // Optional
  secondName: string;
  secondLastName: string;
  documentNumber: string;
  documentTypeId: string | null;
  lastAcademicYear: string;   // "1900".."2099"
  gradeId: string | null;     // numeric id from /grades/list-all
  group: string | null;       // "1".."10"
  /** Exact match on the student's birth date (`YYYY-MM-DD`). */
  birthDate: string;
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
  birthDate: "",
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

// ── Search result (student + enrollments) ───────────────────────────────────

/**
 * One enrollment of a student, as returned by POST /students/search.
 * `enrollmentId` and `enrollmentDate` are present when the backend
 * returns them; the rest is what the results table actually displays.
 */
export type EnrollmentEntry = {
  enrollmentId: number | null;
  enrollmentDate: string | null;
  year: number | null;
  shift: Shift | null;
  group: { id: number; name: string } | null;
  grade: { id: number; name: string } | null;
};

/**
 * Student with ALL of their enrollments — the shape the backend's
 * /students/search endpoint returns per item. See `actions.ts`.
 */
export type CertificateSearchStudent = {
  id: number;
  firstName: string;
  middleName: string | null;
  firstLastName: string;
  secondLastName: string | null;
  documentNumber: string | null;
  enrollments: EnrollmentEntry[];
};

/**
 * A single row in the results table.
 *
 * One student with N enrollments yields N rows. A student with no
 * enrollments yields exactly one row with `enrollment: null` so they
 * still appear in the results.
 */
export type CertificateSearchRow = {
  /** Stable React key — unique across the whole result set. */
  key: string;
  student: CertificateSearchStudent;
  /** `null` when the student has no enrollments on record. */
  enrollment: EnrollmentEntry | null;
};

/**
 * Flattens a list of students-with-enrollments into table rows.
 *
 * The row order is preserved: enrollments already arrive newest-first
 * from the backend (see StudentServices.searchStudents).
 */
export function toSearchRows(
  students: CertificateSearchStudent[]
): CertificateSearchRow[] {
  const rows: CertificateSearchRow[] = [];

  for (const student of students) {
    if (student.enrollments.length === 0) {
      rows.push({ key: `student-${student.id}`, student, enrollment: null });
      continue;
    }

    for (const enrollment of student.enrollments) {
      const suffix = enrollment.enrollmentId ?? "none";
      rows.push({
        key: `student-${student.id}-enrollment-${suffix}`,
        student,
        enrollment,
      });
    }
  }

  return rows;
}
