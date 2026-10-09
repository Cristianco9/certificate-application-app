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
//
// Calls 2 and 3 are non-fatal: if either fails, the profile still renders
// with the personal data. Call 3 is gated on the backend by
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
  /** Always `null` today — the backend does not expose certificates yet. */
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

  if (enrollmentOutcome.status === "fulfilled") {
    const res = enrollmentOutcome.value;
    if (res.ok) {
      try {
        const body = (await res.json()) as EnrollmentListApiBody;
        if (Array.isArray(body.enrollments)) {
          enrollmentCount = body.enrollments.length;
          for (const e of body.enrollments) {
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

  return {
    student: studentBody.student,
    phones,
    phoneFetchStatus,
    enrollmentCount,
    lastEnrollmentYear,
    certificateCount: null,
  };
}
