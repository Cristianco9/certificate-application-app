"use client";

import { useState } from "react";
import { ArrowLeft, Filter, RotateCcw } from "lucide-react";

import {
  CertificateResultsTable,
} from "@/components/certificates/CertificateResultsTable";
import {
  CertificateSearchFiltersDialog,
} from "@/components/certificates/CertificateSearchFiltersDialog";

import { searchStudentsAction } from "@/app/certificates/actions";
import { getToken } from "@/lib/auth/token";

import {
  EMPTY_CERTIFICATE_FILTERS,
  hasAnyFilter,
  toSearchRequest,
  toSearchRows,
  type CertificateSearchFilters,
  type CertificateSearchRow,
} from "@/types/certificate-search";

type Stage = "search" | "generate";

export function CertificateGeneratorPage() {
  const [stage, setStage] = useState<Stage>("search");
  const [filters, setFilters] = useState<CertificateSearchFilters>(
    EMPTY_CERTIFICATE_FILTERS
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rows, setRows] = useState<CertificateSearchRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedRow, setSelectedRow] = useState<CertificateSearchRow | null>(
    null
  );

  const filtersActive = hasAnyFilter(filters);

  async function runSearch(next: CertificateSearchFilters) {
    setFilters(next);
    setFiltersOpen(false);
    setIsSearching(true);
    setHasSearched(true);

    const token = getToken();
    if (!token) {
      setRows([]);
      setIsSearching(false);
      return;
    }

    // Empty fields already stripped by toSearchRequest.
    const response = await searchStudentsAction(token, toSearchRequest(next));

    // Each student carries all of their enrollments; flatten into one
    // table row per enrollment (a student with none yields a single
    // row with `enrollment: null`).
    setRows(
      toSearchRows(
        response.students.map((s) => ({
          id: s.id,
          firstName: s.firstName,
          middleName: s.middleName,
          firstLastName: s.firstLastName,
          secondLastName: s.secondLastName,
          documentNumber: s.documentNumber,
          enrollments: s.enrollments,
        }))
      )
    );

    setIsSearching(false);
  }

  function clearFilters() {
    setFilters(EMPTY_CERTIFICATE_FILTERS);
    setRows([]);
    setHasSearched(false);
    setSelectedRow(null);
  }

  function handleSelectRow(row: CertificateSearchRow) {
    setSelectedRow(row);
    setStage("generate");
  }

  function handleBackToResults() {
    setStage("search");
  }

  return (
    <main className="min-h-full bg-[#F0EDED] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1F2937] sm:text-3xl">
            Generar certificado
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Busca al estudiante en el archivo histórico y continúa con la
            generación del certificado.
          </p>
        </header>

        {stage === "search" ? (
          <section className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="
                  inline-flex items-center gap-2 rounded-full bg-[#3B5FC7]
                  px-5 py-2.5 text-sm font-bold text-white shadow-sm
                  transition
                  hover:bg-[#3250a8]
                  focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
                  focus-visible:outline-none
                  active:translate-y-px
                "
              >
                <Filter className="h-4 w-4" aria-hidden="true" />
                Filtros de búsqueda
                {filtersActive && (
                  <span
                    aria-hidden="true"
                    className="ml-1 h-2 w-2 rounded-full bg-white/90"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={clearFilters}
                disabled={!filtersActive && !hasSearched}
                className="
                  inline-flex items-center gap-2 rounded-full border
                  border-[#3B5FC7]/25 bg-white px-5 py-2.5 text-sm font-bold
                  text-[#2861C4] transition
                  hover:border-[#3B5FC7]/50 hover:bg-[#EAF1FC]
                  focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/25
                  focus-visible:outline-none
                  active:translate-y-px
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Limpiar filtros
              </button>
            </div>

            <CertificateResultsTable
              rows={rows}
              isLoading={isSearching}
              hasSearched={hasSearched}
              onClearFilters={clearFilters}
              onOpenFilters={() => setFiltersOpen(true)}
              onSelectRow={handleSelectRow}
            />
          </section>
        ) : (
          <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm sm:p-8">
            <button
              type="button"
              onClick={handleBackToResults}
              className="
                inline-flex items-center gap-1.5 text-sm font-semibold
                text-[#3B5FC7] transition hover:underline
                focus-visible:underline focus-visible:outline-none
              "
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver a resultados
            </button>

            <h2 className="mt-5 text-lg font-extrabold text-[#1F2937]">
              Generación del certificado
            </h2>
            <p className="mt-1.5 text-sm text-gray-500">
              Estudiante seleccionado:{" "}
              <span className="font-semibold text-[#1F2937]">
                {selectedRow
                  ? `${selectedRow.student.firstName} ${selectedRow.student.firstLastName}`
                  : "—"}
              </span>
              {selectedRow?.enrollment && (
                <>
                  {" · "}
                  <span className="text-gray-600">
                    {selectedRow.enrollment.grade?.name ?? "—"}
                    {selectedRow.enrollment.year
                      ? ` (${selectedRow.enrollment.year})`
                      : ""}
                  </span>
                </>
              )}
            </p>
            <p className="mt-4 text-xs text-gray-400">
              {/* Placeholder — wire the certificate-generation form here. */}
              Esta vista se construirá en la siguiente iteración.
            </p>
          </section>
        )}
      </div>

      <CertificateSearchFiltersDialog
        open={filtersOpen}
        filters={filters}
        onClose={() => setFiltersOpen(false)}
        onApply={runSearch}
      />
    </main>
  );
}
