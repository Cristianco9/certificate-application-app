/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CERTIFICATE — Certificate, Recipient & Signature Types
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Mirrors:
 *   - `src/db/models/certificate.js`           (certificado)
 *   - `src/db/models/certificateRecipient.js`  (receptor_certificado)
 *   - `src/db/models/certificateSignature.js`  (firma_certificado)
 *   - `src/services/certificateRecipientServices.js`
 *
 * NOTE: The Certificate and CertificateSignature services are NOT yet
 * implemented in the backend (only their migrations and models exist).
 * The entity types below reflect their documented model shape so the
 * frontend can build against a stable contract once the endpoints land.
 */

import type { AuthenticatedApiResponse, CatalogReference } from './api';
import type { Enrollment, Institution } from './academicHistory';
import type { User } from './user';

/** Certificate status ENUM. */
export type CertificateStatus = 'EMITIDO' | 'ANULADO' | 'REIMPRESO';

// ── Certificate Recipient ───────────────────────────────────────────────────

/**
 * Full CertificateRecipient record as returned by
 * `CertificateRecipientServices`.
 */
export type CertificateRecipient = {
  id: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  secondLastName: string | null;
  documentNumber: string;
  address: string;
  documentType: CatalogReference | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCertificateRecipientRequest = {
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName?: string;
  documentTypeId: string;
  documentNumber: string;
  address: string;
};

export type UpdateCertificateRecipientRequest = {
  id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  secondLastName?: string;
  documentTypeId?: string;
  documentNumber?: string;
  address?: string;
};

export type SearchCertificateRecipientsByNameRequest = {
  partialName: string;
};

export type GetCertificateRecipientByDocumentNumberRequest = {
  documentNumber: string;
};

export type ListCertificateRecipientsByDocumentTypeRequest = {
  documentTypeId: string;
};

export type GetCertificateRecipientByIdRequest = {
  id: string;
};

export type DeleteCertificateRecipientRequest = {
  id: string;
};

export type CertificateRecipientListResponse = AuthenticatedApiResponse<{
  certificateRecipients: CertificateRecipient[];
}>;

export type CertificateRecipientResponse = AuthenticatedApiResponse<{
  certificateRecipient: CertificateRecipient;
}>;

// ── Certificate Signature ───────────────────────────────────────────────────

export type CertificateSignature = {
  id: number;
  signer: User;
  certificate: Certificate;
  municipality: CatalogReference | null;
  createdAt: string;
  updatedAt: string;
};

// ── Certificate ─────────────────────────────────────────────────────────────

/**
 * Full Certificate record.
 *
 * `signatures` is an array because a certificate may need more than one
 * authorized signer (e.g. Rector + Academic Secretary).
 */
export type Certificate = {
  id: number;
  /** Official record/act number, unique across the institution. */
  actNumber: string;
  /** DATEONLY — serialized as `YYYY-MM-DD`. */
  issueDate: string;
  status: CertificateStatus;
  issuer: User | null;
  institution: Institution | null;
  enrollment: Enrollment | null;
  recipient: CertificateRecipient | null;
  signatures: CertificateSignature[];
  createdAt: string;
  updatedAt: string;
};

// ── Request payloads (for future endpoints) ─────────────────────────────────

export type IssueCertificateRequest = {
  enrollmentId: string;
  institutionId: string;
  signerUserIds: string[];
  recipientId?: string;
};

export type RegisterCertificateDeliveryRequest = {
  certificateId: string;
  recipientName: string;
  recipientDocument: string;
  relationship: string;
  phone?: string;
  address?: string;
  deliveredAt: string;
  observations?: string;
};
