import { apiClient, assertEndpoint, type PaginatedResponse } from "@/services/api";

const studentEndpoints = {
  search: null,
  detail: null,
  update: null,
  academicHistory: null,
} satisfies Record<string, string | null>;

export type StudentSearchParams = {
  firstName?: string;
  secondName?: string;
  surnames?: string;
  documentNumber?: string;
  documentType?: string;
  lastAcademicYear?: number;
  grade?: string;
  group?: string;
  birthplace?: string;
  page?: number;
  pageSize?: number;
};

export type StudentSummary = {
  id: string;
  fullName: string;
  documentNumber: string | null;
  graduationYear: number | null;
  grade: string | null;
  group: string | null;
};

export type StudentDetail = StudentSummary & {
  birthDate: string | null;
  gender: string | null;
  email: string | null;
  address: string | null;
  phone: string | null;
  birthplace: string | null;
};

export type AcademicHistoryRecord = {
  id: string;
  year: number;
  grade: string;
  group: string | null;
};

export function searchStudents(
  params: StudentSearchParams
): Promise<PaginatedResponse<StudentSummary>> {
  return apiClient.get<PaginatedResponse<StudentSummary>>(
    assertEndpoint(studentEndpoints.search, "students.search"),
    { query: params }
  );
}

export function getStudent(studentId: string): Promise<StudentDetail> {
  return apiClient.get<StudentDetail>(
    assertEndpoint(studentEndpoints.detail, "students.detail").replace(
      ":studentId",
      studentId
    )
  );
}

export function updateStudent(
  studentId: string,
  payload: Partial<StudentDetail>
): Promise<StudentDetail> {
  return apiClient.patch<StudentDetail, Partial<StudentDetail>>(
    assertEndpoint(studentEndpoints.update, "students.update").replace(
      ":studentId",
      studentId
    ),
    { body: payload }
  );
}

export function getAcademicHistory(
  studentId: string
): Promise<AcademicHistoryRecord[]> {
  return apiClient.get<AcademicHistoryRecord[]>(
    assertEndpoint(
      studentEndpoints.academicHistory,
      "students.academicHistory"
    ).replace(":studentId", studentId)
  );
}
