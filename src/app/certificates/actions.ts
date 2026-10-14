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
// `Secretario` or `Rector`, that call returns 403 and `phones` stays `[]`.
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
      // Most likely 403 if the current session role is Secretario or Rector
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

// ── Institution (certificate header) ────────────────────────────────────────
//
// Backing endpoints:
//   POST /institutions/list-one               → name, NIT, DANE code, ...
//   POST /institution-phones/get-by-institution → phone list
//
// The institution id is fixed for this deployment — the system serves a
// single institution, so id "1" is hard-coded. Multi-institution support
// would turn this into a config value.
//
// Fields the API does not carry yet (resolutions, website, "SEDE Principal")
// live in `@/lib/certificates/institutionConfig`.
//
// NOTE ON AUTHORIZATION: `/institutions/list-one` currently accepts only
// `['Máster', 'Administrador']`. Until the backend widens it to include
// `Rector` and `Secretario` (the two other roles that can reach
// `/certificates`), this call returns 403 for those roles. The preview
// page handles that gracefully — see `CertificatePreviewPage.tsx`.

const INSTITUTION_ID = "1";

export type InstitutionForCertificate = {
  id: number;
  name: string;
  institutionalCode: string;
  address: string;
  email: string;
  nitId: string;
  municipality: { id: number; name: string } | null;
  /** Phone numbers registered in `institucion_telefono`. */
  phones: string[];
};

type InstitutionApiBody = {
  institution?: {
    id: number;
    name: string;
    institutionalCode: string;
    address: string;
    email: string;
    nitId: string;
    municipality: { id: number; name: string } | null;
  };
};

type InstitutionPhoneListApiBody = {
  institutionPhones?: Array<{
    id: number;
    phone?: { id: number; number: string } | null;
  }>;
};

export async function fetchInstitutionForCertificateAction(
  token: string
): Promise<InstitutionForCertificate | null> {
  if (!API_URL || !API_KEY || !token) return null;

  const authHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    apikey: API_KEY,
    Authorization: `Bearer ${token}`,
  };

  const [institutionOutcome, phoneOutcome] = await Promise.allSettled([
    fetch(`${API_URL}/institutions/list-one`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ id: INSTITUTION_ID }),
      cache: "no-store",
    }),
    fetch(`${API_URL}/institution-phones/get-by-institution`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ institutionId: INSTITUTION_ID }),
      cache: "no-store",
    }),
  ]);

  if (institutionOutcome.status !== "fulfilled") return null;
  const institutionRes = institutionOutcome.value;
  if (!institutionRes.ok) {
    console.warn(
      `[fetchInstitutionForCertificateAction] institutions/list-one → ${institutionRes.status}`
    );
    return null;
  }

  let institutionBody: InstitutionApiBody;
  try {
    institutionBody = (await institutionRes.json()) as InstitutionApiBody;
  } catch {
    return null;
  }
  if (!institutionBody.institution) return null;

  // Phones are best-effort — a failing phone call must not blank the header.
  let phones: string[] = [];
  if (phoneOutcome.status === "fulfilled" && phoneOutcome.value.ok) {
    try {
      const body =
        (await phoneOutcome.value.json()) as InstitutionPhoneListApiBody;
      if (Array.isArray(body.institutionPhones)) {
        phones = body.institutionPhones
          .map((link) => link.phone?.number)
          .filter((n): n is string => typeof n === "string" && n.length > 0);
      }
    } catch {
      /* keep phones empty */
    }
  }

  return { ...institutionBody.institution, phones };
}

// ── Certificate signers ─────────────────────────────────────────────────────
//
// A signed certificate carries two signatures: the issuer (the current
// session's user) and the institution's rector.
//
// Both come from POST /users/get-signer-candidates, which returns only
// the fields the certificate needs (name, document, role, municipality,
// academic level) and only users whose role is one of Rector /
// Secretario / Administrador. It is reachable by every role that can
// reach /certificates, unlike /users/list-all which is admin-only.
//
// The `municipality` object carries a nested `department` because
// Colombian identity documents are issued by "City - Department"
// (`de Roldanillo - Valle del Cauca`), and the certificate prints both.
//
// The `academicLevel` object carries the abbreviation (e.g. "Mgs",
// "Esp", "Ph.D") used to prefix the signer's name.
//
// When the certificate-generation endpoint lands and starts writing
// `firma_certificado` rows, replace this lookup with a read of that
// table — the returned `CertificateSigner` shape stays the same.

export type CertificateSigner = {
  fullName: string;
  /** Abbreviated document type, e.g. "c.c" / "T.I" / "Pasaporte". */
  documentTypeAbbr: string;
  documentNumber: string;
  /**
   * City and department where the document was issued, already joined
   * with " - " (e.g. "Roldanillo - Valle del Cauca"). Empty when the
   * signer has no municipality registered.
   */
  documentCity: string;
  /**
   * Academic-level abbreviation from the `nivel_academico` ENUM
   * (e.g. "Téc", "Tgo", "Lic", "Esp", "Mgs", "Ph.D"). Empty string when
   * the signer has no academic level registered — the UI then renders
   * just the name without a prefix.
   */
  academicLevelAbbr: string;
  /** Raw role name from the DB, e.g. "Rector" / "Secretario". */
  roleLabel: string;
};

export type CertificateSigners = {
  issuer: CertificateSigner | null;
  rector: CertificateSigner | null;
};

type SignerCandidateShape = {
  id: number;
  firstName: string;
  lastName: string;
  documentNumber: string;
  documentType: { id: number; name: string } | null;
  municipality: {
    id: number;
    name: string;
    /** Present only if the backend includes the nested department. */
    department?: { id: number; name: string } | null;
  } | null;
  academicLevel: {
    id: number;
    name: string;
    abbreviation: string;
  } | null;
  role: { id: number; name: string } | null;
};

type SignerCandidatesApiBody = { users?: SignerCandidateShape[] };

function abbreviateDocumentType(name: string | null | undefined): string {
  switch (name) {
    case "Cédula de Ciudadanía":
      return "c.c";
    case "Cédula de Extranjería":
      return "c.e";
    case "Tarjeta de Identidad":
      return "T.I";
    case "Pasaporte":
      return "Pasaporte";
    case "NIT":
      return "NIT";
    default:
      return "doc.";
  }
}

function buildSigner(user: SignerCandidateShape): CertificateSigner {
  const city = user.municipality?.name ?? "";
  const department = user.municipality?.department?.name ?? "";

  // "Roldanillo - Valle del Cauca" when both are present;
  // whichever one exists when only one is; "" when neither.
  const cityAndDepartment =
    city && department ? `${city} - ${department}` : city || department;

  return {
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    documentTypeAbbr: abbreviateDocumentType(user.documentType?.name),
    documentNumber: user.documentNumber,
    documentCity: cityAndDepartment,
    academicLevelAbbr: user.academicLevel?.abbreviation ?? "",
    roleLabel: user.role?.name ?? "",
  };
}

export async function fetchCertificateSignersAction(
  token: string,
  issuerUserId: number
): Promise<CertificateSigners> {
  if (!API_URL || !API_KEY || !token) {
    return { issuer: null, rector: null };
  }

  try {
    const res = await fetch(`${API_URL}/users/get-signer-candidates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: API_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(
        `[fetchCertificateSignersAction] users/get-signer-candidates → ${res.status}`
      );
      return { issuer: null, rector: null };
    }

    const body = (await res.json()) as SignerCandidatesApiBody;
    const candidates = Array.isArray(body.users) ? body.users : [];

    const issuerUser = candidates.find((u) => u.id === issuerUserId) ?? null;
    const rectorUser =
      candidates.find((u) => u.role?.name === "Rector") ?? null;

    return {
      issuer: issuerUser ? buildSigner(issuerUser) : null,
      rector: rectorUser ? buildSigner(rectorUser) : null,
    };
  } catch (error) {
    console.warn("[fetchCertificateSignersAction] request failed:", error);
    return { issuer: null, rector: null };
  }
}

// ── Certificate act-number preview ──────────────────────────────────────────
//
// Backing endpoint: GET /certificates/next-act-number
// Returns the act number that WOULD be assigned to the next certificate
// created today, WITHOUT creating it — the service only reads the highest
// existing consecutive for the current year and increments it. Safe to
// call on every preview mount.

type NextActNumberApiBody = {
  actNumber?: unknown;
};

export async function fetchNextActNumberAction(
  token: string
): Promise<string | null> {
  if (!API_URL || !API_KEY || !token) return null;

  try {
    const res = await fetch(`${API_URL}/certificates/next-act-number`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        apikey: API_KEY,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(
        `[fetchNextActNumberAction] certificates/next-act-number → ${res.status}`
      );
      return null;
    }

    const body = (await res.json()) as NextActNumberApiBody;
    return typeof body.actNumber === "string" ? body.actNumber : null;
  } catch (error) {
    console.warn("[fetchNextActNumberAction] request failed:", error);
    return null;
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
 * `enrollmentId` is sent as a STRING because the backend's Joi schema
 * validates it with `Joi.string().pattern(/^\d{1,10}$/)`.
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
      console.warn(
        `[countCertificatesForEnrollments] certificates/get-by-enrollment → ${res.status}`
      );
      return null;
    }
    // 404 falls through silently: "no certificate yet" is the normal case.
  }

  return count;
}
