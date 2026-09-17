import { apiClient, assertEndpoint } from "@/services/api";

const databaseEndpoints = {
  previewImport: null,
  confirmImport: null,
} satisfies Record<string, string | null>;

export type ImportPreviewResult = {
  validRecords: number;
  duplicateRecords: number;
  recordsWithErrors: number;
  uploadId: string;
};

export type ImportConfirmationResult = {
  importedRecords: number;
  skippedRecords: number;
};

export function previewHistoricalImport(
  file: File
): Promise<ImportPreviewResult> {
  const formData = new FormData();
  formData.set("file", file);

  return apiClient.post<ImportPreviewResult, FormData>(
    assertEndpoint(databaseEndpoints.previewImport, "database.previewImport"),
    { body: formData }
  );
}

export function confirmHistoricalImport(
  uploadId: string
): Promise<ImportConfirmationResult> {
  return apiClient.post<ImportConfirmationResult, { uploadId: string }>(
    assertEndpoint(databaseEndpoints.confirmImport, "database.confirmImport"),
    { body: { uploadId } }
  );
}
