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
  // One certificate per enrollment is no longer the rule: a certificate
  // now covers one OR MANY enrollments through the 'certificado_matricula'
  // bridge table. The bridge still enforces UNIQUE on id_matricula, so an
  // enrollment belongs to at most one certificate. Counting certificates
  // for a student therefore still reduces to "how many of this student's
  // enrollments are linked to a certificate", which is what
  // `countCertificatesForEnrollments` measures.
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
//
// NOTE: this number is a preview only. The authoritative number is the
// one returned by `registerCertificatesAction` after the certificate is
// actually persisted. The two can differ if another user issues a
// certificate between the preview and the confirmation.

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

// ── Certificate creation (persist the record) ──────────────────────────────
//
// Backing endpoint: POST /certificates/create
//
// ONE certificate covers ONE OR MANY enrollments. The certificate row is
// inserted into `certificado` and each enrollment is linked through the
// bridge table `certificado_matricula` inside a single transaction:
// either the whole group is committed or nothing is.
//
// The bridge enforces UNIQUE on `id_matricula`, so an enrollment can
// belong to AT MOST ONE certificate. A retry that tries to re-link an
// already-linked enrollment will fail with 409 (conflict), which we
// surface to the user instead of silently succeeding — the batch can't
// be idempotently resolved when only some enrollments are already taken.
//
// The act number ('YY-NNN') is generated server-side and covers the
// WHOLE certificate, so a single number is returned for the whole batch.
// The preview document renders it on every page via its fallback logic
// (`actNumbers[index] ?? firstActNumber`).
//
// `issueDate` is sent as `YYYY-MM-DD`, matching the backend's DATEONLY
// column and its `Joi.date()` validator.

export type RegisterCertificatesInput = {
  userId: string;
  institutionId: string;
  /** One or more enrollment ids — the certificate's full scope. */
  enrollmentIds: number[];
  recipientId: number;
  /** `YYYY-MM-DD` in the institution's timezone. */
  issueDate: string;
};

export type RegisterCertificatesResult =
  | { success: true; actNumbers: string[] }
  | { success: false; message: string; actNumbers: string[] };

const REGISTER_CERT_ERROR_MESSAGES = {
  generic:
    "No se pudo registrar el certificado. Inténtelo de nuevo.",
  forbidden:
    "Tu rol no tiene permiso para generar certificados. Contacta al administrador.",
  sessionExpired:
    "La sesión expiró. Vuelve a iniciar sesión e inténtalo de nuevo.",
  conflict:
    "Una o más de las matrículas seleccionadas ya tienen un certificado emitido. " +
    "Quita esas matrículas de la selección o consulta el repositorio de certificados.",
  system:
    "El sistema está experimentando problemas. Por favor, inténtelo de nuevo más tarde.",
} as const;

export async function registerCertificatesAction(
  token: string,
  input: RegisterCertificatesInput
): Promise<RegisterCertificatesResult> {
  if (!API_URL || !API_KEY || !token) {
    return {
      success: false,
      message: REGISTER_CERT_ERROR_MESSAGES.system,
      actNumbers: [],
    };
  }

  if (input.enrollmentIds.length === 0) {
    return {
      success: false,
      message:
        "Debe seleccionar al menos una matrícula para generar el certificado.",
      actNumbers: [],
    };
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    apikey: API_KEY,
    Authorization: `Bearer ${token}`,
  };

  try {
    const res = await fetch(`${API_URL}/certificates/create`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        issueDate: input.issueDate,
        userId: input.userId,
        institutionId: input.institutionId,
        // ONE certificate → MANY enrollments, linked through
        // `certificado_matricula`. The backend rejects this call with a
        // 400 if any enrollment is missing from the array or has a bad
        // shape — see `certificateSchema.newCertificateData`.
        enrollmentIds: input.enrollmentIds.map(String),
        recipientId: String(input.recipientId),
        // status omitted → backend defaults to 'EMITIDO'
      }),
      cache: "no-store",
    });

    // ── 401 — session expired or revoked ──────────────────────────
    if (res.status === 401) {
      return {
        success: false,
        message: REGISTER_CERT_ERROR_MESSAGES.sessionExpired,
        actNumbers: [],
      };
    }

    // ── 403 — role not allowed to issue certificates ──────────────
    if (res.status === 403) {
      return {
        success: false,
        message: REGISTER_CERT_ERROR_MESSAGES.forbidden,
        actNumbers: [],
      };
    }

    // ── 409 — one of the enrollments already has a certificate ────
    // The bridge enforces UNIQUE on id_matricula; the service rejects
    // the whole batch with a conflict when any enrollment is already
    // linked, so the transaction stays atomic and no partial certificate
    // is written.
    if (res.status === 409) {
      return {
        success: false,
        message: REGISTER_CERT_ERROR_MESSAGES.conflict,
        actNumbers: [],
      };
    }

    // ── Any other non-2xx ─────────────────────────────────────────
    if (!res.ok) {
      let serverMessage: string | null = null;
      try {
        const errBody = (await res.json()) as { message?: unknown };
        if (typeof errBody.message === "string" && errBody.message.length > 0) {
          serverMessage = errBody.message;
        }
      } catch {
        /* non-JSON body — fall back to the generic message */
      }

      console.warn(
        `[registerCertificatesAction] certificates/create → ${res.status}`,
        serverMessage
      );

      return {
        success: false,
        message: serverMessage ?? REGISTER_CERT_ERROR_MESSAGES.generic,
        actNumbers: [],
      };
    }

    // ── 201 — parse the act number ────────────────────────────────
    const body = (await res.json()) as { actNumber?: unknown };

    if (typeof body.actNumber !== "string" || body.actNumber.length === 0) {
      console.warn(
        "[registerCertificatesAction] certificates/create OK but no actNumber:",
        body
      );
      return {
        success: false,
        message: REGISTER_CERT_ERROR_MESSAGES.generic,
        actNumbers: [],
      };
    }

    // A single act number covers every page of this certificate. The
    // `CertificateDocument` fallback (`actNumbers[index] ?? firstActNumber`)
    // renders it on each page, so a one-element array is the correct shape.
    return { success: true, actNumbers: [body.actNumber] };
  } catch (error) {
    console.warn("[registerCertificatesAction] request failed:", error);
    return {
      success: false,
      message: REGISTER_CERT_ERROR_MESSAGES.system,
      actNumbers: [],
    };
  }
}

// ── Certificate recipient registration (delivery flow) ─────────────────────
//
// Called from the delivery-registration dialog on the preview page when
// the user confirms the recipient. Performs a three-step backend dance
// that the current API forces us into, because neither of the create
// endpoints returns the newly-assigned id:
//
//   1. POST /certificate-recipients/create
//        → 201 if the recipient was newly created.
//        → 200 if a recipient with the same document number already
//          existed AND its critical identification fields (firstName,
//          lastName, documentTypeId, documentNumber, relationship)
//          matched. The backend updates the stored address with the
//          one submitted and returns success.
//        → 409 if a recipient with the same document number exists but
//          its critical fields DO NOT match — a data-entry conflict
//          the operator must resolve. Surface this as a hard error.
//   2. POST /certificate-recipients/get-by-document-number
//        → resolves the recipient's id (both 200 and 201 paths need it).
//   3. For each phone:
//        a. POST /phones/get-by-number → 404 means "not yet in catalog"
//        b. POST /phones/create        → 409 tolerated (race)
//        c. POST /phones/get-by-number → resolve the phone's id
//        d. POST /certificate-recipient-phones/create → link
//           (409 tolerated ONLY when the phone is already linked to THIS
//           recipient — a 409 caused by a different owner is surfaced
//           as a real error; see isPhoneLinkedToRecipient below)
//
// The `relationship` field IS forwarded now: it is one of the critical
// identification fields the backend uses to decide whether a returning
// recipient is the same person, so it must travel with the payload.

export type RegisterCertificateRecipientInput = {
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName?: string;
  documentTypeId: string;
  documentNumber: string;
  relationship: string;
  address: string;
  /** One or more phone numbers. Empty strings are dropped. */
  phones: string[];
};

export type RegisterCertificateRecipientResult =
  | { success: true; recipientId: number }
  | { success: false; message: string };

const RECIPIENT_ERROR_MESSAGES = {
  generic:
    "No se pudo registrar el receptor del certificado. Inténtelo de nuevo.",
  fetchRecipient:
    "El receptor fue creado, pero no pudimos recuperar su identificador.",
  fetchPhone: (number: string) =>
    `No pudimos recuperar el identificador del teléfono ${number}.`,
  linkPhone: (number: string) =>
    `No pudimos vincular el teléfono ${number} al receptor.`,
  forbiddenPhoneLookup:
    "Tu rol no tiene permiso para consultar el catálogo de teléfonos. " +
    "Contacta al administrador del sistema para completar el registro.",
  phoneOwnedByOther: (number: string) =>
    `El teléfono ${number} ya está vinculado a otro registro ` +
    `(usuario, estudiante, institución o receptor). ` +
    `Desvincúlalo primero o usa un número distinto.`,
  identityMismatch:
    "Ya existe un receptor del certificado con el mismo número de documento, " +
    "pero sus datos de identificación no coinciden (nombre, primer apellido, " +
    "tipo de documento o parentesco). Verifica la información ingresada.",
  system:
    "El sistema está experimentando problemas. Por favor, inténtelo de nuevo más tarde.",
} as const;

/**
 * Reads the server's `message` field from a non-2xx response body.
 * Returns `null` when the body is missing, not JSON, or has no string
 * `message` — so the caller can fall back to a generic string without
 * having to special-case every failure mode.
 */
async function readServerMessage(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { message?: unknown };
    return typeof body.message === "string" && body.message.length > 0
      ? body.message
      : null;
  } catch {
    return null;
  }
}

export async function registerCertificateRecipientAction(
  token: string,
  input: RegisterCertificateRecipientInput
): Promise<RegisterCertificateRecipientResult> {
  if (!API_URL || !API_KEY || !token) {
    return { success: false, message: RECIPIENT_ERROR_MESSAGES.system };
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    apikey: API_KEY,
    Authorization: `Bearer ${token}`,
  };

  try {
    // ── 1. Create-or-update recipient ──────────────────────────────────
    // The backend decides between create and update based on the stored
    // document number. A 200 response means "existing recipient with
    // matching identity — address refreshed"; a 201 means "new recipient".
    // Both are successful.
    const createRes = await fetch(`${API_URL}/certificate-recipients/create`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        firstName: input.firstName,
        middleName: input.middleName ?? "",
        lastName: input.lastName,
        secondLastName: input.secondLastName ?? "",
        documentTypeId: input.documentTypeId,
        documentNumber: input.documentNumber,
        relationship: input.relationship,
        address: input.address,
      }),
      cache: "no-store",
    });

    // ── Non-2xx handling ─────────────────────────────────────────────
    // Every failure branch now attempts to surface the server's own
    // `message` — a Boom error payload carries a specific, user-actionable
    // string (e.g. "document type does not exist", "recipient identity
    // mismatch"), which is strictly more useful than the generic
    // fallback. Falls back to the generic string only when the body
    // isn't JSON or has no message.
    if (!createRes.ok) {
      const serverMessage = await readServerMessage(createRes);

      console.warn(
        `[registerCertificateRecipientAction] certificate-recipients/create → ${createRes.status}`,
        serverMessage
      );

      // 409 → a recipient with this document number already exists but
      // their stored identity does not match what was submitted. This
      // is a data-entry conflict the operator must resolve. Prefer the
      // server's message when available, since the backend's wording is
      // the one that names the mismatched fields.
      if (createRes.status === 409) {
        return {
          success: false,
          message: serverMessage ?? RECIPIENT_ERROR_MESSAGES.identityMismatch,
        };
      }

      // 401 → the session expired between the preview page load and this
      // call. Surface the session-expired copy so the user knows to log
      // in again rather than retrying the same form.
      if (createRes.status === 401) {
        return {
          success: false,
          message:
            "La sesión expiró. Vuelve a iniciar sesión e inténtalo de nuevo.",
        };
      }

      // 403 → the role is not allowed to create recipients. Theoretically
      // unreachable here because the /certificates route already gates on
      // role, but the backend independently enforces authorization — a
      // role change mid-session or a token tampering attempt would land
      // here.
      if (createRes.status === 403) {
        return {
          success: false,
          message:
            "Tu rol no tiene permiso para registrar receptores de certificado. " +
            "Contacta al administrador.",
        };
      }

      return {
        success: false,
        message: serverMessage ?? RECIPIENT_ERROR_MESSAGES.generic,
      };
    }

    // ── 2. Resolve recipient id ────────────────────────────────────────
    const getRes = await fetch(
      `${API_URL}/certificate-recipients/get-by-document-number`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ documentNumber: input.documentNumber }),
        cache: "no-store",
      }
    );

    if (!getRes.ok) {
      const serverMessage = await readServerMessage(getRes);
      console.warn(
        `[registerCertificateRecipientAction] get-by-document-number → ${getRes.status}`,
        serverMessage
      );
      return {
        success: false,
        message: serverMessage ?? RECIPIENT_ERROR_MESSAGES.fetchRecipient,
      };
    }

    const getBody = (await getRes.json()) as {
      certificateRecipient?: { id: number };
    };
    const recipientId = getBody.certificateRecipient?.id;

    if (typeof recipientId !== "number") {
      return {
        success: false,
        message: RECIPIENT_ERROR_MESSAGES.fetchRecipient,
      };
    }

    // ── 3. Create + link each phone ────────────────────────────────────
    for (const raw of input.phones) {
      const number = raw.trim();
      if (!number) continue;

      const resolved = await resolveOrCreatePhoneId(
        authHeaders,
        number,
        API_URL
      );

      if (resolved.kind === "forbidden") {
        return {
          success: false,
          message: RECIPIENT_ERROR_MESSAGES.forbiddenPhoneLookup,
        };
      }

      if (resolved.kind === "failed") {
        return {
          success: false,
          message: RECIPIENT_ERROR_MESSAGES.fetchPhone(number),
        };
      }

      const linkRes = await fetch(
        `${API_URL}/certificate-recipient-phones/create`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            certificateRecipientId: String(recipientId),
            phoneId: String(resolved.phoneId),
          }),
          cache: "no-store",
        }
      );

      if (linkRes.ok) {
        continue;
      }

      if (linkRes.status === 409) {
        const alreadyLinked = await isPhoneLinkedToRecipient(
          authHeaders,
          API_URL,
          recipientId,
          resolved.phoneId
        );

        if (alreadyLinked) {
          continue;
        }

        return {
          success: false,
          message: RECIPIENT_ERROR_MESSAGES.phoneOwnedByOther(number),
        };
      }

      const serverMessage = await readServerMessage(linkRes);
      return {
        success: false,
        message: serverMessage ?? RECIPIENT_ERROR_MESSAGES.linkPhone(number),
      };
    }

    return { success: true, recipientId };
  } catch (error) {
    console.warn(
      "[registerCertificateRecipientAction] request failed:",
      error
    );
    return { success: false, message: RECIPIENT_ERROR_MESSAGES.system };
  }
}

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Resolves a phone number to its catalog id, creating the phone first
 * if it doesn't exist yet.
 *
 * Returns a discriminated union so the caller can produce a message that
 * matches the actual failure:
 *
 *   • { kind: "ok", phoneId }  → phone exists (or was created), id known
 *   • { kind: "forbidden" }    → the current session's role cannot read
 *                                the phone catalog.
 *   • { kind: "failed" }       → transient error (network, 5xx, malformed
 *                                response). Retrying helps.
 */
async function resolveOrCreatePhoneId(
  authHeaders: Record<string, string>,
  number: string,
  apiUrl: string
): Promise<
  | { kind: "ok"; phoneId: number }
  | { kind: "forbidden" }
  | { kind: "failed" }
> {
  const lookup = async (): Promise<
    | { kind: "ok"; phoneId: number }
    | { kind: "not-found" }
    | { kind: "forbidden" }
    | { kind: "failed" }
  > => {
    const res = await fetch(`${apiUrl}/phones/get-by-number`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ number }),
      cache: "no-store",
    });

    if (res.status === 403) return { kind: "forbidden" };
    if (res.status === 404) return { kind: "not-found" };
    if (!res.ok) return { kind: "failed" };

    const body = (await res.json()) as { phone?: { id: number } };
    return typeof body.phone?.id === "number"
      ? { kind: "ok", phoneId: body.phone.id }
      : { kind: "failed" };
  };

  const first = await lookup();
  if (first.kind === "ok") return first;
  if (first.kind === "forbidden") return first;

  const createRes = await fetch(`${apiUrl}/phones/create`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ number }),
    cache: "no-store",
  });

  if (createRes.status === 403) return { kind: "forbidden" };
  if (!createRes.ok && createRes.status !== 409) return { kind: "failed" };

  const second = await lookup();
  if (second.kind === "ok") return second;
  if (second.kind === "forbidden") return second;

  return { kind: "failed" };
}

/**
 * Returns `true` if `phoneId` is already among the phones linked to
 * `recipientId`.
 *
 * Failure semantics: on any error (non-2xx, malformed body, network
 * failure) we return `false` — deliberately biased toward treating the
 * 409 as a real conflict rather than a silent success.
 */
async function isPhoneLinkedToRecipient(
  authHeaders: Record<string, string>,
  apiUrl: string,
  recipientId: number,
  phoneId: number
): Promise<boolean> {
  try {
    const res = await fetch(
      `${apiUrl}/certificate-recipient-phones/get-by-certificate-recipient`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          certificateRecipientId: String(recipientId),
        }),
        cache: "no-store",
      }
    );

    if (!res.ok) return false;

    const body = (await res.json()) as {
      certificateRecipientPhones?: Array<{
        phone?: { id: number } | null;
      }>;
    };

    if (!Array.isArray(body.certificateRecipientPhones)) return false;

    return body.certificateRecipientPhones.some(
      (link) => link.phone?.id === phoneId
    );
  } catch {
    return false;
  }
}

/**
 * Counts how many of the given enrollments already have a certificate
 * issued for them.
 *
 * Backing endpoint: POST /certificates/get-by-enrollment
 * Because the bridge table enforces UNIQUE on `id_matricula`, at most
 * one certificate can ever own a given enrollment — a 200 means "this
 * enrollment is certified", a 404 means "not yet".
 *
 * Failure semantics:
 *   - A 404 is counted as "no certificate" and does NOT poison the
 *     total — it is the normal state for an enrollment that has not
 *     yet been certified.
 *   - Any other non-2xx status collapses the whole result to `null`.
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
  }

  return count;
}
