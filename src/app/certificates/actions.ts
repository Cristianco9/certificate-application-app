"use server";

import type { EnrollmentEntry } from "@/types/certificate-search";

// `.trim()` guards against a leading/trailing space in the .env file.
const API_URL = process.env.API_URL?.trim() ?? "";
const API_KEY = process.env.API_KEY?.trim() ?? "";

// ── Catalogs ────────────────────────────────────────────────────────────────

export type DocumentTypeOption = { id: string; name: string };
export type GradeOption = { id: string; name: string; sequence: number };

type DocumentTypeResponse = {
  documentTypes?: Array<{ id: number; name: string }>;
};
type GradeResponse = {
  grades?: Array<{ id: number; name: string }>;
};

export async function fetchDocumentTypesAction(
  token: string
): Promise<DocumentTypeOption[]> {
  if (!API_URL || !API_KEY || !token) return [];
  try {
    const res = await fetch(`${API_URL}/document-types/list-all`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        apikey: API_KEY,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = (await res.json()) as DocumentTypeResponse;
    if (!Array.isArray(body.documentTypes)) return [];
    return body.documentTypes.map((d) => ({ id: String(d.id), name: d.name }));
  } catch {
    return [];
  }
}

export async function fetchGradesAction(
  token: string
): Promise<GradeOption[]> {
  if (!API_URL || !API_KEY || !token) return [];
  try {
    const res = await fetch(`${API_URL}/grades/list-all`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        apikey: API_KEY,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = (await res.json()) as GradeResponse;
    if (!Array.isArray(body.grades)) return [];
    return body.grades.map((g, index) => ({
      id: String(g.id),
      name: g.name,
      sequence: index + 1,
    }));
  } catch {
    return [];
  }
}

// ── Student search ──────────────────────────────────────────────────────────

export type StudentSearchResponseItem = {
  id: number;
  firstName: string;
  middleName: string | null;
  firstLastName: string;
  secondLastName: string | null;
  documentNumber: string | null;
  enrollments: EnrollmentEntry[];
};

export type StudentSearchResponse = {
  success: boolean;
  message: string;
  total: number;
  students: StudentSearchResponseItem[];
};

export async function searchStudentsAction(
  token: string,
  filters: Record<string, string>
): Promise<StudentSearchResponse> {
  const empty: StudentSearchResponse = {
    success: false,
    message: "",
    total: 0,
    students: [],
  };

  if (!API_URL || !API_KEY || !token) return empty;

  try {
    const res = await fetch(`${API_URL}/students/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: API_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(filters),
      cache: "no-store",
    });

    if (!res.ok) return empty;

    const body = (await res.json()) as StudentSearchResponse;
    if (!Array.isArray(body.students)) return empty;

    body.students = body.students.map((s) => ({
      ...s,
      enrollments: Array.isArray(s.enrollments) ? s.enrollments : [],
    }));

    return body;
  } catch {
    return empty;
  }
}

// ── Student profile ─────────────────────────────────────────────────────────
//
// Backing endpoints for the profile page:
//   1. POST /students/list-one              → personal data (REQUIRED)
//   2. POST /enrollments/get-by-student     → enrollment list
//   3. POST /student-phones/get-by-student  → phone numbers
//   4. POST /certificates/get-by-enrollment → certificate count (fan-out)
//
// Calls 2–4 are non-fatal: if any fails, the profile still renders with
// whatever data was retrieved. Call 3 is gated on the backend by
// `checkRole(['Máster', 'Administrador', 'Auxiliar'])` on
// `/student-phones/get-by-student`. When the current session's role is
// `Funcionario` or `Rector`, that call returns 403 and `phones` stays `[]`.
// The failure is captured in `phoneFetchStatus` and surfaced to the UI so
// the phone field can explain *why* it's empty instead of just showing "—".

export type StudentProfileData = {
  id: number;
  firstName: string;
  middleName: string | null;
  firstLastName: string;
  secondLastName: string | null;
  documentNumber: string | null;
  birthDate: string;
  address: string | null;
  email: string | null;
  municipality: { id: number; name: string } | null;
  documentType: { id: number; name: string } | null;
  gender: { id: number; name: string } | null;
};

export type StudentProfile = {
  student: StudentProfileData;
  /** Phone numbers, in the order returned by the backend. */
  phones: string[];
  /**
   * HTTP status of the /student-phones/get-by-student call:
   *   200 → phones fetched successfully (may still be an empty array)
   *   403 → the session's role is not in ['Máster','Administrador','Auxiliar']
   *   404 → route renamed
   *   0   → network error / server unreachable
   */
  phoneFetchStatus: number;
  enrollmentCount: number;
  lastEnrollmentYear: number | null;
  /**
   * Number of certificates already issued for this student, derived from
   * POST /certificates/get-by-enrollment per enrollment.
   *
   * `null` means the count could not be trusted — one of the underlying
   * calls returned a status other than 200 / 404 (403 role mismatch,
   * 5xx, or network failure). The UI renders "—" in that case rather
   * than a misleading partial number.
   */
  certificateCount: number | null;
};

type StudentDetailApiBody = {
  student?: StudentProfileData;
};

type EnrollmentListApiBody = {
  enrollments?: Array<{
    id: number;
    enrollmentDate: string;
    group?: { id: number; name: string; year: number } | null;
  }>;
};

type StudentPhoneListApiBody = {
  studentPhones?: Array<{
    id: number;
    phone?: { id: number; number: string } | null;
  }>;
};

export async function fetchStudentProfileAction(
  token: string,
  studentId: string
): Promise<StudentProfile | null> {
  if (!API_URL || !API_KEY || !token || !studentId) return null;

  const authHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    apikey: API_KEY,
    Authorization: `Bearer ${token}`,
  };

  // ── 1. Student (required) ────────────────────────────────────────────
  let studentBody: StudentDetailApiBody;
  try {
    const studentRes = await fetch(`${API_URL}/students/list-one`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ id: studentId }),
      cache: "no-store",
    });

    if (!studentRes.ok) {
      console.warn(
        `[fetchStudentProfileAction] students/list-one for ${studentId} → ${studentRes.status}`
      );
      return null;
    }

    studentBody = (await studentRes.json()) as StudentDetailApiBody;
  } catch (error) {
    console.error("[fetchStudentProfileAction] students/list-one error:", error);
    return null;
  }

  if (!studentBody.student) return null;

  // ── 2. Enrollments + phones in parallel ─────────────────────────────
  // `Promise.allSettled` (not `Promise.all`) so a network error on one
  // call never blocks the other from contributing data.
  const [enrollmentOutcome, phoneOutcome] = await Promise.allSettled([
    fetch(`${API_URL}/enrollments/get-by-student`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ studentId }),
      cache: "no-store",
    }),
    fetch(`${API_URL}/student-phones/get-by-student`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ studentId }),
      cache: "no-store",
    }),
  ]);

  // ── Enrollments ──────────────────────────────────────────────────────
  let enrollmentCount = 0;
  let lastEnrollmentYear: number | null = null;
  const enrollmentIds: number[] = [];

  if (enrollmentOutcome.status === "fulfilled") {
    const res = enrollmentOutcome.value;
    if (res.ok) {
      try {
        const body = (await res.json()) as EnrollmentListApiBody;
        if (Array.isArray(body.enrollments)) {
          enrollmentCount = body.enrollments.length;
          for (const e of body.enrollments) {
            // Collect the id for the certificate-count fan-out below.
            // Guard against a malformed row so a bad record doesn't
            // poison the whole list.
            if (typeof e.id === "number") {
              enrollmentIds.push(e.id);
            }

            const year = e.group?.year;
            if (
              typeof year === "number" &&
              (lastEnrollmentYear === null || year > lastEnrollmentYear)
            ) {
              lastEnrollmentYear = year;
            }
          }
        }
      } catch (error) {
        console.warn(
          "[fetchStudentProfileAction] enrollments JSON parse failed:",
          error
        );
      }
    } else {
      console.warn(
        `[fetchStudentProfileAction] enrollments/get-by-student for ${studentId} → ${res.status}`
      );
    }
  }

  // ── Phones ───────────────────────────────────────────────────────────
  let phones: string[] = [];
  let phoneFetchStatus = 0;

  if (phoneOutcome.status === "fulfilled") {
    const res = phoneOutcome.value;
    phoneFetchStatus = res.status;

    if (res.ok) {
      try {
        const body = (await res.json()) as StudentPhoneListApiBody;
        if (Array.isArray(body.studentPhones)) {
          phones = body.studentPhones
            .map((link) => link.phone?.number)
            .filter((n): n is string => typeof n === "string" && n.length > 0);
        } else {
          console.warn(
            "[fetchStudentProfileAction] phone response OK but no `studentPhones` array:",
            body
          );
        }
      } catch (error) {
        console.warn(
          "[fetchStudentProfileAction] phones JSON parse failed:",
          error
        );
      }
    } else {
      // Most likely 403 if the current session role is Funcionario or Rector
      // (both can reach /certificates but neither is in the phone route's
      // checkRole allow-list). See the frontend note above the function.
      console.warn(
        `[fetchStudentProfileAction] student-phones/get-by-student for ${studentId} → ${res.status}`
      );
    }
  } else {
    console.warn(
      "[fetchStudentProfileAction] phones fetch rejected:",
      phoneOutcome.reason
    );
  }

  // ── Certificates ─────────────────────────────────────────────────────
  // One certificate per enrollment (`certificado.id_matricula_certificado`
  // is UNIQUE on the backend), so the student's certificate count is
  // exactly the number of enrollments that already have a certificate.
  // See `countCertificatesForEnrollments` for the failure semantics.
  const certificateCount = await countCertificatesForEnrollments(
    API_URL,
    authHeaders,
    enrollmentIds
  );

  return {
    student: studentBody.student,
    phones,
    phoneFetchStatus,
    enrollmentCount,
    lastEnrollmentYear,
    certificateCount,
  };
}

// ── Academic history (for the certificate-generation view) ─────────────────
//
// Backing endpoint: POST /students/get-academic-history
// Returns a flat list of score rows; each row carries its own enrollment
// id plus the year / grade / group / subject it belongs to. The UI groups
// these by enrollmentId to build the enrollment selector and the per-
// enrollment scores table.

export type AcademicHistoryRow = {
  year: number | null;
  grade: { id: number; name: string } | null;
  group: { id: number; name: string } | null;
  subject: { id: number; name: string; hourlyIntensity: number } | null;
  originalScore: string;
  scoreType: "NUMERICA" | "ALFABETICA";
  remedialScore: string;
  enrollmentId: number | null;
};

type AcademicHistoryApiBody = {
  history?: AcademicHistoryRow[];
};

export async function fetchStudentAcademicHistoryAction(
  token: string,
  studentId: string
): Promise<AcademicHistoryRow[]> {
  if (!API_URL || !API_KEY || !token || !studentId) return [];

  try {
    const res = await fetch(`${API_URL}/students/get-academic-history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: API_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ studentId }),
      cache: "no-store",
    });

    if (!res.ok) return [];

    const body = (await res.json()) as AcademicHistoryApiBody;
    if (!Array.isArray(body.history)) return [];
    return body.history;
  } catch {
    return [];
  }
}

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Counts how many of the given enrollments already have a certificate
 * issued for them.
 *
 * Backend contract (`POST /certificates/get-by-enrollment`):
 *   200 → { certificate: { ... } }  → this enrollment has a certificate
 *   404 → no certificate for this enrollment (expected, not an error)
 *   any other status → unexpected; the total cannot be trusted
 *
 * Failure semantics:
 *   - A 404 is counted as "no certificate" and does NOT poison the
 *     total — it is the normal state for an enrollment that has not
 *     yet been certified.
 *   - Any other non-2xx status (403 role mismatch, 5xx, network error)
 *     collapses the whole result to `null`, so the UI renders "—"
 *     instead of a partial count that could be mistaken for a real
 *     number.
 *
 * All lookups run in parallel. The typical enrollment list is 4–8 items,
 * so the whole batch resolves in roughly the latency of a single call.
 *
 * `enrollmentId` is sent as a STRING because the backend's Joi schema
 * (`certificateSchema.getCertificateByEnrollment`) validates it with
 * `Joi.string().pattern(/^\d{1,10}$/)` — a raw number would 400.
 */
async function countCertificatesForEnrollments(
  apiUrl: string,
  authHeaders: Record<string, string>,
  enrollmentIds: number[]
): Promise<number | null> {
  if (enrollmentIds.length === 0) return 0;

  const results = await Promise.allSettled(
    enrollmentIds.map((enrollmentId) =>
      fetch(`${apiUrl}/certificates/get-by-enrollment`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ enrollmentId: String(enrollmentId) }),
        cache: "no-store",
      })
    )
  );

  let count = 0;

  for (const result of results) {
    if (result.status === "rejected") {
      // Network-level failure — we cannot trust the total.
      console.warn(
        "[countCertificatesForEnrollments] certificate lookup rejected:",
        result.reason
      );
      return null;
    }

    const res = result.value;

    if (res.ok) {
      count += 1;
    } else if (res.status !== 404) {
      // 403 / 5xx / anything else — we cannot trust the total.
      console.warn(
        `[countCertificatesForEnrollments] certificates/get-by-enrollment → ${res.status}`
      );
      return null;
    }
    // 404 falls through silently: "no certificate yet" is the normal case.
  }

  return count;
}
