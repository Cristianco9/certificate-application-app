"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";

import {
  CertificateResultsTable,
} from "@/components/certificates/CertificateResultsTable";
import {
  CertificateSearchFiltersDialog,
} from "@/components/certificates/CertificateSearchFiltersDialog";

import { searchStudentsAction } from "@/app/certificates/actions";
import { getToken } from "@/lib/auth/token";
import {
  clearSearchSession,
  loadSearchSession,
  saveSearchSession,
  setSelectedStudentId,
} from "@/lib/certificates/searchSession";

import {
  EMPTY_CERTIFICATE_FILTERS,
  hasAnyFilter,
  toSearchRequest,
  toSearchRows,
  type CertificateSearchFilters,
  type CertificateSearchRow,
} from "@/types/certificate-search";

export function CertificateGeneratorPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<CertificateSearchFilters>(
    EMPTY_CERTIFICATE_FILTERS
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rows, setRows] = useState<CertificateSearchRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Restore the last search when the user comes back from a profile.
  // Runs after mount so it can't desync SSR and client markup.
  useEffect(() => {
    const restored = loadSearchSession();
    if (!restored) return;

    setFilters(restored.filters);
    setRows(restored.rows);
    setHasSearched(true);
  }, []);

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

    const nextRows = toSearchRows(
      response.students.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        middleName: s.middleName,
        firstLastName: s.firstLastName,
        secondLastName: s.secondLastName,
        documentNumber: s.documentNumber,
        enrollments: s.enrollments,
      }))
    );

    setRows(nextRows);
    setIsSearching(false);

    // Persist so a click into a profile and back preserves the list.
    saveSearchSession(next, nextRows);
  }

  function clearFilters() {
    setFilters(EMPTY_CERTIFICATE_FILTERS);
    setRows([]);
    setHasSearched(false);
    clearSearchSession();
  }

  /**
   * Click on a result row → hand the selected student id to the profile
   * page through sessionStorage (not the URL) and navigate.
   */
  function handleSelectRow(row: CertificateSearchRow) {
    setSelectedStudentId(row.student.id);
    router.push("/certificates/student");
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
