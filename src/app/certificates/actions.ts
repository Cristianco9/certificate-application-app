"use server";

import type { EnrollmentEntry } from "@/types/certificate-search";
import type { CertificateRepositoryRow } from "@/types/certificate-repository";

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
  phones: string[];
  phoneFetchStatus: number;
  enrollmentCount: number;
  lastEnrollmentYear: number | null;
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

const INSTITUTION_ID = "1";

export type InstitutionForCertificate = {
  id: number;
  name: string;
  institutionalCode: string;
  address: string;
  email: string;
  nitId: string;
  municipality: { id: number; name: string } | null;
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

export type CertificateSigner = {
  fullName: string;
  documentTypeAbbr: string;
  documentNumber: string;
  documentCity: string;
  academicLevelAbbr: string;
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

export type RegisterCertificatesInput = {
  userId: string;
  institutionId: string;
  enrollmentIds: number[];
  recipientId: number;
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
        enrollmentIds: input.enrollmentIds.map(String),
        recipientId: String(input.recipientId),
      }),
      cache: "no-store",
    });

    if (res.status === 401) {
      return {
        success: false,
        message: REGISTER_CERT_ERROR_MESSAGES.sessionExpired,
        actNumbers: [],
      };
    }

    if (res.status === 403) {
      return {
        success: false,
        message: REGISTER_CERT_ERROR_MESSAGES.forbidden,
        actNumbers: [],
      };
    }

    if (res.status === 409) {
      return {
        success: false,
        message: REGISTER_CERT_ERROR_MESSAGES.conflict,
        actNumbers: [],
      };
    }

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

export type RegisterCertificateRecipientInput = {
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName?: string;
  documentTypeId: string;
  documentNumber: string;
  relationship: string;
  address: string;
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

    if (!createRes.ok) {
      const serverMessage = await readServerMessage(createRes);

      console.warn(
        `[registerCertificateRecipientAction] certificate-recipients/create → ${createRes.status}`,
        serverMessage
      );

      if (createRes.status === 409) {
        return {
          success: false,
          message: serverMessage ?? RECIPIENT_ERROR_MESSAGES.identityMismatch,
        };
      }

      if (createRes.status === 401) {
        return {
          success: false,
          message:
            "La sesión expiró. Vuelve a iniciar sesión e inténtalo de nuevo.",
        };
      }

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

// ── Certificate repository (paginated listing with filters) ────────────────

export type CertificateRepositoryApiPage = {
  total: number;
  offset: number;
  limit: number;
  certificates: CertificateRepositoryRow[];
};

export async function fetchCertificatesRepositoryAction(
  token: string,
  params: {
    offset: number;
    limit: number;
    filters: Record<string, string>;
  }
): Promise<CertificateRepositoryApiPage> {
  const empty: CertificateRepositoryApiPage = {
    total: 0,
    offset: params.offset,
    limit: params.limit,
    certificates: [],
  };

  if (!API_URL || !API_KEY || !token) return empty;

  try {
    const res = await fetch(`${API_URL}/certificates/list-paginated`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: API_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        offset: params.offset,
        limit: params.limit,
        filters: params.filters,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(
        `[fetchCertificatesRepositoryAction] certificates/list-paginated → ${res.status}`
      );
      return empty;
    }

    const body = (await res.json()) as Partial<CertificateRepositoryApiPage>;

    if (!Array.isArray(body.certificates)) return empty;

    return {
      total: typeof body.total === "number" ? body.total : 0,
      offset: typeof body.offset === "number" ? body.offset : params.offset,
      limit: typeof body.limit === "number" ? body.limit : params.limit,
      certificates: body.certificates,
    };
  } catch (error) {
    console.warn(
      "[fetchCertificatesRepositoryAction] request failed:",
      error
    );
    return empty;
  }
}

// ── Certificate detail (repository → detail page) ─────────────────────────
//
// Backing endpoints, all called in parallel where possible:
//   1. POST /certificates/list-one                     → certificate + enrollments + student
//   2. POST /groups/list-one                           → group.shift (jornada) enrichment
//   3. POST /students/list-one                         → student.documentType enrichment
//   4. POST /certificate-recipients/list-one           → recipient detail
//   5. POST /certificate-recipient-phones/get-by-...   → recipient phones
//
// Calls 2–5 are best-effort: if any of them fails, the page still renders
// with the data the certificate already carries. Two fields REQUIRE an
// extra call because the certificate's own include deliberately drops
// them:
//
//   • `student.documentType` — dropped by `CertificateServices.ENROLLMENTS_INCLUDE`
//     (see `Student.attributes`).
//   • `group.shift` (jornada) — dropped by the same include
//     (see `Group.attributes`). The `listForRepository` query DOES include
//     it, but `listOne` does not — hence this enrichment.
//
// The backend DOES NOT persist a dedicated delivery date. `createdAt` on
// the certificate is used as the delivery moment, which is accurate in
// the current issuance flow (recipient is registered → certificate is
// created → print → success). See the type comment on
// `CertificateRepositoryRow.createdAt` for details.

export type RecipientDetail = {
  id: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  secondLastName: string | null;
  documentNumber: string;
  documentType: { id: number; name: string } | null;
  relationship: string | null;
  address: string | null;
};

export type CertificateDetail = {
  certificate: CertificateRepositoryRow;
  recipientDetail: RecipientDetail | null;
  recipientPhones: string[];
};

export async function fetchCertificateDetailAction(
  token: string,
  certificateId: string
): Promise<CertificateDetail | null> {
  if (!API_URL || !API_KEY || !token || !certificateId) return null;

  const authHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    apikey: API_KEY,
    Authorization: `Bearer ${token}`,
  };

  // ── 1. Certificate ──────────────────────────────────────────────────
  let certificate: CertificateRepositoryRow | null = null;
  try {
    const res = await fetch(`${API_URL}/certificates/list-one`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ id: certificateId }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(
        `[fetchCertificateDetailAction] certificates/list-one for ${certificateId} → ${res.status}`
      );
      return null;
    }

    const body = (await res.json()) as {
      certificate?: CertificateRepositoryRow;
    };
    certificate = body.certificate ?? null;
  } catch (error) {
    console.warn(
      "[fetchCertificateDetailAction] certificates/list-one failed:",
      error
    );
    return null;
  }

  if (!certificate) return null;

  // ── 2. Enrichment (best-effort, parallel) ───────────────────────────
  //
  // Every one of these is optional: a failure on any of them leaves the
  // page renderable with the data the certificate already carries. The
  // two fields that REQUIRE an extra call are documented above.
  const primaryEnrollment = certificate.enrollments[0] ?? null;
  const studentId = primaryEnrollment?.student?.id ?? null;
  const recipientId = certificate.recipient?.id ?? null;

  // Enrollments whose group lacks `shift` — need a `/groups/list-one`
  // lookup. We capture the enrollment index so we can merge the response
  // back into the right row later.
  const enrollmentsMissingShift = certificate.enrollments
    .map((enrollment, index) => ({
      index,
      groupId: enrollment.group?.id,
      hasShift: enrollment.group?.shift != null,
    }))
    .filter(
      (entry): entry is { index: number; groupId: number; hasShift: false } =>
        typeof entry.groupId === "number" && !entry.hasShift
    );

  // Build the parallel task list. Indices are remembered so we can map
  // each settled result back to its purpose after `allSettled`.
  const tasks: Array<Promise<Response>> = [];

  const studentTaskIndex = studentId !== null ? tasks.length : -1;
  if (studentId !== null) {
    tasks.push(
      fetch(`${API_URL}/students/list-one`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ id: String(studentId) }),
        cache: "no-store",
      })
    );
  }

  const recipientDetailTaskIndex = recipientId !== null ? tasks.length : -1;
  if (recipientId !== null) {
    tasks.push(
      fetch(`${API_URL}/certificate-recipients/list-one`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ id: String(recipientId) }),
        cache: "no-store",
      })
    );
  }

  const recipientPhonesTaskIndex = recipientId !== null ? tasks.length : -1;
  if (recipientId !== null) {
    tasks.push(
      fetch(
        `${API_URL}/certificate-recipient-phones/get-by-certificate-recipient`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ certificateRecipientId: String(recipientId) }),
          cache: "no-store",
        }
      )
    );
  }

  // One `/groups/list-one` task per enrollment missing its shift.
  const groupTaskIndices = enrollmentsMissingShift.map(({ groupId }) => {
    const idx = tasks.length;
    tasks.push(
      fetch(`${API_URL}/groups/list-one`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ id: String(groupId) }),
        cache: "no-store",
      })
    );
    return idx;
  });

  const settled = await Promise.allSettled(tasks);

  let studentDocumentType: { id: number; name: string } | null = null;
  let recipientDetail: RecipientDetail | null = null;
  let recipientPhones: string[] = [];
  const shiftByEnrollmentIndex = new Map<number, string>();

  // ── Student document type ───────────────────────────────────────────
  if (studentTaskIndex >= 0) {
    const res = settled[studentTaskIndex];
    if (res.status === "fulfilled" && res.value.ok) {
      try {
        const body = (await res.value.json()) as {
          student?: {
            documentType?: { id: number; name: string } | null;
          };
        };
        studentDocumentType = body.student?.documentType ?? null;
      } catch {
        /* keep null */
      }
    } else if (res.status === "fulfilled") {
      console.warn(
        `[fetchCertificateDetailAction] students/list-one for ${studentId} → ${res.value.status}`
      );
    }
  }

  // ── Recipient detail ────────────────────────────────────────────────
  if (recipientDetailTaskIndex >= 0) {
    const res = settled[recipientDetailTaskIndex];
    if (res.status === "fulfilled" && res.value.ok) {
      try {
        const body = (await res.value.json()) as {
          certificateRecipient?: RecipientDetail;
        };
        recipientDetail = body.certificateRecipient ?? null;
      } catch {
        /* keep null */
      }
    }
  }

  // ── Recipient phones ────────────────────────────────────────────────
  if (recipientPhonesTaskIndex >= 0) {
    const res = settled[recipientPhonesTaskIndex];
    if (res.status === "fulfilled" && res.value.ok) {
      try {
        const body = (await res.value.json()) as {
          certificateRecipientPhones?: Array<{
            phone?: { id: number; number: string } | null;
          }>;
        };
        if (Array.isArray(body.certificateRecipientPhones)) {
          recipientPhones = body.certificateRecipientPhones
            .map((link) => link.phone?.number)
            .filter(
              (n): n is string => typeof n === "string" && n.length > 0
            );
        }
      } catch {
        /* keep empty */
      }
    }
  }

  // ── Group shifts (jornada) ──────────────────────────────────────────
  // Each settled response corresponds to one missing-shift enrollment.
  // We store the resolved `shift` keyed by the enrollment index so the
  // merge step below can reconstruct the enrollments array in order.
  for (let i = 0; i < enrollmentsMissingShift.length; i++) {
    const taskIdx = groupTaskIndices[i];
    const res = settled[taskIdx];
    if (res.status !== "fulfilled" || !res.value.ok) {
      if (res.status === "fulfilled") {
        console.warn(
          `[fetchCertificateDetailAction] groups/list-one for ${enrollmentsMissingShift[i].groupId} → ${res.value.status}`
        );
      }
      continue;
    }
    try {
      const body = (await res.value.json()) as {
        group?: { shift?: string | null };
      };
      const shift = body.group?.shift;
      if (typeof shift === "string" && shift.length > 0) {
        shiftByEnrollmentIndex.set(
          enrollmentsMissingShift[i].index,
          shift
        );
      }
    } catch {
      /* keep null */
    }
  }

  // ── Merge shifts back into the enrollments array ────────────────────
  if (shiftByEnrollmentIndex.size > 0) {
    certificate = {
      ...certificate,
      enrollments: certificate.enrollments.map((enrollment, index) => {
        const shift = shiftByEnrollmentIndex.get(index);
        if (!shift || !enrollment.group) return enrollment;
        return {
          ...enrollment,
          group: { ...enrollment.group, shift },
        };
      }),
    };
  }

  // ── Attach the resolved document type onto the primary enrollment ──
  // Mutating the first enrollment is the cleanest way to surface the
  // enriched field through the existing `CertificateRepositoryRow`
  // shape, without adding a parallel "studentDetail" object to
  // `CertificateDetail` just for one field.
  if (studentDocumentType && certificate.enrollments.length > 0) {
    const [first, ...rest] = certificate.enrollments;
    certificate = {
      ...certificate,
      enrollments: [
        {
          ...first,
          student: first.student
            ? { ...first.student, documentType: studentDocumentType }
            : null,
        },
        ...rest,
      ],
    };
  }

  return { certificate, recipientDetail, recipientPhones };
}
