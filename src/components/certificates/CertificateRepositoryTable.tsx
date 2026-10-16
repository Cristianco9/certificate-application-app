"use client";

import { Inbox, Search } from "lucide-react";

import {
  collectDistinctGradeNames,
  countDistinctGrades,
  countEnrollments,
  formatIssuerName,
  formatRecipientName,
  formatStudentName,
  pickPrimaryEnrollment,
  type CertificateRepositoryRow,
} from "@/types/certificate-repository";

type Props = {
  rows: CertificateRepositoryRow[];
  isLoading: boolean;
  hasSearched: boolean;
  onClearFilters: () => void;
  onOpenFilters: () => void;
};

const SKELETON_ROWS = 6;

/**
 * Results table for the certificate repository.
 *
 * Columns:
 *   Certificado · Nombre completo · Expedido por · Documento ·
 *   Grados / matrículas · Recibido por
 *
 * La columna "Grados / matrículas" reemplaza las antiguas columnas
 * "Año de grado" y "Grado / grupo". En lugar de mostrar la información
 * de UNA sola matrícula (la primera del array), resume cuántos grados
 * distintos y cuántas matrículas cubre el certificado completo — que es
 * la información relevante cuando un mismo acta abarca varias
 * matrículas.
 *
 * `hasSearched` distingue "el operador aún no ha lanzado ninguna
 * consulta" (placeholder rows) de "la consulta no devolvió nada"
 * (estado vacío).
 */
export function CertificateRepositoryTable({
  rows,
  isLoading,
  hasSearched,
  onClearFilters,
  onOpenFilters,
}: Props) {
  const isEmpty = hasSearched && !isLoading && rows.length === 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_20px_50px_-30px_rgba(40,97,196,0.25)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
        <h2 className="text-xl font-extrabold tracking-tight text-[#2861C4] sm:text-2xl">
          Historial de Certificados
        </h2>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF1FC] px-3 py-1 text-xs font-semibold text-[#2861C4]">
              Buscando…
            </span>
          )}
          {!isLoading && hasSearched && rows.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF1FC] px-3 py-1 text-xs font-semibold text-[#2861C4]">
              {rows.length} {rows.length === 1 ? "certificado" : "certificados"}
            </span>
          )}
        </div>
      </header>

      <div className="max-h-[calc(100dvh-22rem)] overflow-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#F8FAFC]">
            <tr>
              <Th className="w-[12%]">Certificado</Th>
              <Th className="w-[24%]">Nombre completo</Th>
              <Th className="w-[16%]">Expedido por</Th>
              <Th className="w-[12%]">Documento</Th>
              <Th className="w-[18%]">Grados / matrículas</Th>
              <Th className="w-[18%]">Recibido por</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows />
            ) : isEmpty ? (
              <EmptyRow
                colSpan={6}
                onClearFilters={onClearFilters}
                onOpenFilters={onOpenFilters}
              />
            ) : rows.length > 0 ? (
              rows.map((row) => <ResultRow key={row.id} row={row} />)
            ) : (
              <PlaceholderRows />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`
        border-b border-gray-200 px-4 py-2.5 text-[11px] font-bold
        tracking-wider text-gray-500 uppercase
        ${className}
      `}
    >
      {children}
    </th>
  );
}

function ResultRow({ row }: { row: CertificateRepositoryRow }) {
  // Todas las matrículas de un certificado pertenecen al mismo estudiante
  // en la práctica, así que tomamos la primera para extraer el nombre y
  // el documento — igual que antes.
  const enrollment = pickPrimaryEnrollment(row);
  const studentName = formatStudentName(enrollment?.student ?? null);
  const documentNumber = enrollment?.student?.documentNumber ?? "—";

  return (
    <tr className="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-[#EAF1FC]">
      <td className="px-4 py-3.5">
        <span className="font-mono text-sm font-bold tabular-nums text-[#2861C4]">
          {row.actNumber}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className="truncate text-sm font-semibold text-[#1F2937]">
          {studentName}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-sm text-gray-700">
          {formatIssuerName(row.issuer)}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className="font-mono text-sm tabular-nums text-gray-600">
          {documentNumber}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <CoverageCell row={row} />
      </td>
      <td className="px-4 py-3.5">
        <span className="truncate text-sm text-gray-700">
          {formatRecipientName(row.recipient)}
        </span>
      </td>
    </tr>
  );
}

/**
 * Cobertura del certificado: cuántos grados y cuántas matrículas cubre.
 *
 * - Badge azul: número de GRADOS distintos.
 * - Línea inferior: número total de MATRÍCULAS.
 * - `title` sobre toda la celda: nombres de los grados (tooltip), para
 *   que el operador sepa qué grados están involucrados sin abrir el
 *   certificado.
 *
 * Cuando el certificado no tiene matrículas (dato roto o certificado
 * creado sin enlaces), mostramos un texto gris en lugar del badge.
 */
function CoverageCell({ row }: { row: CertificateRepositoryRow }) {
  const enrollmentCount = countEnrollments(row);
  const gradeCount = countDistinctGrades(row);
  const gradeNames = collectDistinctGradeNames(row);

  if (enrollmentCount === 0) {
    return <span className="text-sm text-gray-400">Sin matrículas</span>;
  }

  const gradeLabel = gradeCount === 1 ? "grado" : "grados";
  const enrollmentLabel =
    enrollmentCount === 1 ? "matrícula" : "matrículas";
  const tooltip = gradeNames.length > 0 ? gradeNames.join(", ") : undefined;

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1"
      title={tooltip}
    >
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#EAF1FC] px-2 py-0.5 text-xs font-bold text-[#2861C4]">
        <span className="tabular-nums">{gradeCount}</span>
        <span>{gradeLabel}</span>
      </span>

      <span aria-hidden="true" className="text-gray-300">
        ·
      </span>

      <span className="text-xs text-gray-500">
        <span className="font-semibold text-gray-600 tabular-nums">
          {enrollmentCount}
        </span>{" "}
        {enrollmentLabel}
      </span>
    </div>
  );
}

function PlaceholderRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr
          key={i}
          className="border-b border-gray-100/80 last:border-b-0"
          aria-hidden="true"
        >
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className="h-3 w-3/4 rounded-full bg-gray-100/70" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <tr
          key={i}
          className="border-b border-gray-100/80 last:border-b-0"
          aria-hidden="true"
        >
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className="h-3 w-3/4 animate-pulse rounded-full bg-gray-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyRow({
  colSpan,
  onClearFilters,
  onOpenFilters,
}: {
  colSpan: number;
  onClearFilters: () => void;
  onOpenFilters: () => void;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-16">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF1FC]">
            <Inbox className="h-6 w-6 text-[#2861C4]" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-base font-bold text-[#1F2937]">
            No se encontraron certificados
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            Prueba cambiando los criterios de búsqueda o eliminando alguno
            de los filtros aplicados.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onOpenFilters}
              className="
                inline-flex items-center gap-1.5 rounded-md bg-[#3B5FC7]
                px-4 py-2 text-xs font-bold text-white shadow-sm transition
                hover:bg-[#3250a8]
                focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
                focus-visible:outline-none
              "
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              Modificar filtros
            </button>
            <button
              type="button"
              onClick={onClearFilters}
              className="
                inline-flex items-center gap-1.5 rounded-md border border-gray-200
                bg-white px-4 py-2 text-xs font-semibold text-[#1F2937]
                transition hover:border-gray-300 hover:bg-gray-50
                focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/15
                focus-visible:outline-none
              "
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
