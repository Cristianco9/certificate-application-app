"use client";

import { Inbox, Search, UserRound } from "lucide-react";

import type {
  CertificateSearchRow,
  CertificateSearchStudent,
} from "@/types/certificate-search";

type CertificateResultsTableProps = {
  rows: CertificateSearchRow[];
  isLoading: boolean;
  /** `false` until the user runs the first search. */
  hasSearched: boolean;
  /** Clears every filter and returns to the placeholder state. */
  onClearFilters: () => void;
  /** Opens the filters dialog when the user has no results yet. */
  onOpenFilters: () => void;
  /** Fires when the user clicks a row (student + one enrollment). */
  onSelectRow: (row: CertificateSearchRow) => void;
};

const PLACEHOLDER_ROW_COUNT = 8;
const SKELETON_ROW_COUNT = 5;

export function CertificateResultsTable({
  rows,
  isLoading,
  hasSearched,
  onClearFilters,
  onOpenFilters,
  onSelectRow,
}: CertificateResultsTableProps) {
  const isEmpty = hasSearched && !isLoading && rows.length === 0;

  // The count shown to the user is the number of students, not the
  // number of rows — a student with 4 enrollments is 1 match, not 4.
  const studentCount = new Set(rows.map((r) => r.student.id)).size;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_20px_50px_-30px_rgba(40,97,196,0.25)]">
      {/* ── Card header ─────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-extrabold tracking-tight text-[#2861C4] sm:text-2xl">
            Resultados
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF1FC] px-3 py-1 text-xs font-semibold text-[#2861C4]">
              Buscando…
            </span>
          )}
          {!isLoading && hasSearched && studentCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF1FC] px-3 py-1 text-xs font-semibold text-[#2861C4]">
              {studentCount}{" "}
              {studentCount === 1 ? "estudiante" : "estudiantes"}
            </span>
          )}
        </div>
      </header>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="max-h-[calc(100dvh-20rem)] overflow-auto">
        <table className="w-full min-w-[840px] border-collapse text-left">
          <thead className="sticky top-0 z-10">
            {/* Row 1 — grouped headers */}
            <tr className="bg-[#F8FAFC]">
              <Th rowSpan={2} className="w-[30%] align-middle">
                Nombre completo
              </Th>
              <Th rowSpan={2} className="w-[15%] align-middle">
                Documento
              </Th>
              <Th
                colSpan={4}
                className="w-[47%] border-b-0 border-l border-gray-200 text-center"
              >
                Matrículas
              </Th>
            </tr>

            {/* Row 2 — sub-columns */}
            <tr className="bg-[#F8FAFC]">
              <Th className="w-[10%] border-l border-gray-200">Año</Th>
              <Th className="w-[13%]">Grado</Th>
              <Th className="w-[11%]">Grupo</Th>
              <Th className="w-[13%]">Jornada</Th>
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
              rows.map((row, index) => {
                const previous = index > 0 ? rows[index - 1] : null;
                // A stronger top border visually groups the enrollments
                // that belong to the same student.
                const startsNewStudent =
                  !previous || previous.student.id !== row.student.id;

                return (
                  <ResultRow
                    key={row.key}
                    row={row}
                    startsNewStudent={startsNewStudent}
                    onSelect={onSelectRow}
                  />
                );
              })
            ) : (
              <PlaceholderRows />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Sub-components                                                     */
/* ────────────────────────────────────────────────────────────────── */

function Th({
  children,
  className = "",
  rowSpan,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  rowSpan?: number;
  colSpan?: number;
}) {
  return (
    <th
      scope="col"
      rowSpan={rowSpan}
      colSpan={colSpan}
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

function ResultRow({
  row,
  startsNewStudent,
  onSelect,
}: {
  row: CertificateSearchRow;
  startsNewStudent: boolean;
  onSelect: (row: CertificateSearchRow) => void;
}) {
  const { student, enrollment } = row;
  const fullName = getFullName(student);
  const initials = getInitials(student);

  function handleSelect() {
    onSelect(row);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect();
    }
  }

  return (
    <tr
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      aria-label={`Generar certificado para ${fullName}${enrollment?.grade?.name ? ` — ${enrollment.grade.name}` : ""
        }`}
      className={`
        group cursor-pointer border-b border-gray-100 transition-colors
        last:border-b-0
        hover:bg-[#EAF1FC]
        focus-visible:bg-[#EAF1FC] focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3B5FC7]/40
        ${startsNewStudent ? "border-t-2 border-t-gray-200/70" : ""}
      `}
    >
      {/* Name + avatar */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="
              flex h-10 w-10 shrink-0 items-center justify-center rounded-full
              bg-[#EAF1FC] text-xs font-extrabold text-[#2861C4]
              transition-colors group-hover:bg-white
              group-focus-visible:bg-white
            "
          >
            {initials || <UserRound className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#1F2937]">
              {fullName}
            </p>
          </div>
        </div>
      </td>

      {/* Document */}
      <td className="px-4 py-3.5">
        <span className="font-mono text-sm tabular-nums text-gray-600">
          {student.documentNumber ?? "—"}
        </span>
      </td>

      {/* Año */}
      <td className="border-l border-gray-100 px-4 py-3.5">
        {enrollment?.year ? (
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700 tabular-nums transition-colors group-hover:bg-white group-focus-visible:bg-white">
            {enrollment.year}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>

      {/* Grado */}
      <td className="px-4 py-3.5">
        {enrollment?.grade?.name ? (
          <span className="text-sm font-semibold text-[#1F2937]">
            {enrollment.grade.name}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>

      {/* Grupo */}
      <td className="px-4 py-3.5">
        {enrollment?.group?.name ? (
          <span className="text-sm text-gray-600">
            {enrollment.group.name}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>

      {/* Jornada */}
      <td className="px-4 py-3.5">
        {enrollment?.shift ? (
          <span
            className={`
        inline-flex items-center rounded px-2 py-0.5
        text-[10px] font-bold tracking-wide uppercase
        ${enrollment.shift.toLowerCase() === "diurna"
                ? "bg-[#EAF1FC] text-[#2861C4] group-hover:bg-white group-focus-visible:bg-white"
                : "bg-[#EDE9FE] text-[#6328C4] group-hover:bg-white group-focus-visible:bg-white"
              }
      `}
          >
            {enrollment.shift}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>

    </tr>
  );
}

/** Default state before any search. */
function PlaceholderRows() {
  return (
    <>
      {Array.from({ length: PLACEHOLDER_ROW_COUNT }).map((_, index) => (
        <tr
          key={index}
          className="border-b border-gray-100/80 last:border-b-0"
          aria-hidden="true"
        >
          <td className="px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-gray-100/70" />
              <div className="h-3 w-40 rounded-full bg-gray-100/70" />
            </div>
          </td>
          <td className="px-4 py-3.5">
            <div className="h-3 w-20 rounded-full bg-gray-100/70" />
          </td>
          <td className="border-l border-gray-100 px-4 py-3.5">
            <div className="h-4 w-10 rounded-md bg-gray-100/70" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-3 w-16 rounded-full bg-gray-100/70" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-3 w-12 rounded-full bg-gray-100/70" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-4 w-14 rounded bg-gray-100/70" />
          </td>
        </tr>
      ))}
    </>
  );
}

/** Animated shimmer while a search is in-flight. */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
        <tr
          key={index}
          className="border-b border-gray-100/80 last:border-b-0"
          aria-hidden="true"
        >
          <td className="px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-100" />
              <div className="h-3 w-40 animate-pulse rounded-full bg-gray-100" />
            </div>
          </td>
          <td className="px-4 py-3.5">
            <div className="h-3 w-20 animate-pulse rounded-full bg-gray-100" />
          </td>
          <td className="border-l border-gray-100 px-4 py-3.5">
            <div className="h-4 w-10 animate-pulse rounded-md bg-gray-100" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-3 w-16 animate-pulse rounded-full bg-gray-100" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-3 w-12 animate-pulse rounded-full bg-gray-100" />
          </td>
          <td className="px-4 py-3.5">
            <div className="h-4 w-14 animate-pulse rounded bg-gray-100" />
          </td>
        </tr>
      ))}
    </>
  );
}

/** "No results" — explains what happened and what to do next (guidelines §31). */
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
            No se encontraron estudiantes
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            Prueba cambiando los criterios de búsqueda o eliminando alguno de
            los filtros aplicados.
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
                active:translate-y-px
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
                transition
                hover:border-gray-300 hover:bg-gray-50
                focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/15
                focus-visible:outline-none
                active:translate-y-px
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

/* ────────────────────────────────────────────────────────────────── */
/* Helpers                                                            */
/* ────────────────────────────────────────────────────────────────── */

function getFullName(student: CertificateSearchStudent): string {
  return [
    student.firstName,
    student.middleName,
    student.firstLastName,
    student.secondLastName,
  ]
    .filter(Boolean)
    .join(" ");
}

function getInitials(student: CertificateSearchStudent): string {
  const first = student.firstName.charAt(0);
  const last = student.firstLastName.charAt(0);
  return `${first}${last}`.toUpperCase();
}
