import { apiClient, assertEndpoint, type PaginatedResponse } from "@/services/api";

const certificateEndpoints = {
  list: null,
  generate: null,
  detail: null,
  download: null,
  reprint: null,
  registerDelivery: null,
} satisfies Record<string, string | null>;

export type CertificateScope = "specific" | "all";

export type GenerateCertificateRequest = {
  studentId: string;
  scope: CertificateScope;
  academicYear?: number;
  grade?: string;
  signerUserId: string;
};

export type CertificateSummary = {
  id: string;
  consecutive: string;
  studentId: string;
  issuedAt: string;
  issuedBy: string;
  documentUrl: string | null;
};

export type CertificateDeliveryRequest = {
  certificateId: string;
  recipientName: string;
  recipientDocument: string;
  relationship: string;
  phone?: string;
  address?: string;
  deliveredAt: string;
  observations?: string;
};

export function generateCertificate(
  payload: GenerateCertificateRequest
): Promise<CertificateSummary> {
  return apiClient.post<CertificateSummary, GenerateCertificateRequest>(
    assertEndpoint(certificateEndpoints.generate, "certificates.generate"),
    { body: payload }
  );
}

export function getCertificate(
  certificateId: string
): Promise<CertificateSummary> {
  return apiClient.get<CertificateSummary>(
    assertEndpoint(certificateEndpoints.detail, "certificates.detail").replace(
      ":certificateId",
      certificateId
    )
  );
}

export function listCertificates(): Promise<
  PaginatedResponse<CertificateSummary>
> {
  return apiClient.get<PaginatedResponse<CertificateSummary>>(
    assertEndpoint(certificateEndpoints.list, "certificates.list")
  );
}

export function reprintCertificate(
  certificateId: string
): Promise<CertificateSummary> {
  return apiClient.post<CertificateSummary>(
    assertEndpoint(certificateEndpoints.reprint, "certificates.reprint").replace(
      ":certificateId",
      certificateId
    )
  );
}

export function registerCertificateDelivery(
  payload: CertificateDeliveryRequest
): Promise<CertificateSummary> {
  return apiClient.post<CertificateSummary, CertificateDeliveryRequest>(
    assertEndpoint(
      certificateEndpoints.registerDelivery,
      "certificates.registerDelivery"
    ),
    { body: payload }
  );
}
