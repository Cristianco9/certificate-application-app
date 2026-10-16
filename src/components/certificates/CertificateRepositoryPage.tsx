"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";

import { fetchCertificatesRepositoryAction } from "@/app/certificates/actions";
import { CertificateRepositoryFiltersDialog } from "@/components/certificates/CertificateRepositoryFiltersDialog";
import { CertificateRepositoryTable } from "@/components/certificates/CertificateRepositoryTable";

import { getToken } from "@/lib/auth/token";
import { setSelectedCertificateId } from "@/lib/certificates/repositorySession";

import {
  EMPTY_REPOSITORY_FILTERS,
  REPOSITORY_PAGE_SIZE,
  toRepositoryRequestFilters,
  type CertificateRepositoryFilters,
  type CertificateRepositoryRow,
} from "@/types/certificate-repository";

const TOTAL_PAGE = (total: number, size: number) =>
  Math.max(1, Math.ceil(total / size));

export function CertificateRepositoryPage() {
  const router = useRouter();

  const [filters, setFilters] = useState<CertificateRepositoryFilters>(
    EMPTY_REPOSITORY_FILTERS
  );
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [rows, setRows] = useState<CertificateRepositoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function load(
    pageNumber: number,
    currentFilters: CertificateRepositoryFilters
  ) {
    const token = getToken();
    if (!token) {
      setRows([]);
      setTotal(0);
      setHasSearched(true);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    const offset = (pageNumber - 1) * REPOSITORY_PAGE_SIZE;
    const response = await fetchCertificatesRepositoryAction(token, {
      offset,
      limit: REPOSITORY_PAGE_SIZE,
      filters: toRepositoryRequestFilters(currentFilters),
    });

    setRows(response.certificates);
    setTotal(response.total);
    setIsLoading(false);
  }

  // Run an initial empty query on mount so the operator sees the most
  // recent certificates immediately.
  useEffect(() => {
    load(1, EMPTY_REPOSITORY_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApply(next: CertificateRepositoryFilters) {
    setFilters(next);
    setAppliedFilters(next);
    setFiltersOpen(false);
    setPage(1);
    load(1, next);
  }

  function handleClear() {
    setFilters(EMPTY_REPOSITORY_FILTERS);
    setAppliedFilters(EMPTY_REPOSITORY_FILTERS);
    setPage(1);
    load(1, EMPTY_REPOSITORY_FILTERS);
  }

  function handleGoto(nextPage: number) {
    setPage(nextPage);
    load(nextPage, appliedFilters);
  }

  /**
   * Row click → detail page.
   *
   * The certificate id is handed off through sessionStorage so it never
   * appears in the URL (see `@/lib/certificates/repositorySession`). The
   * detail page reads it back on mount.
   */
  function handleSelectRow(row: CertificateRepositoryRow) {
    setSelectedCertificateId(row.id);
    router.push("/repository/certificate");
  }

  const totalPages = TOTAL_PAGE(total, REPOSITORY_PAGE_SIZE);
  const filtersActive =
    toRepositoryRequestFilters(filters) &&
    Object.keys(toRepositoryRequestFilters(filters)).length > 0;

  return (
    <main className="min-h-full bg-[#F0EDED] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1F2937] sm:text-3xl">
            Repositorio
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Consulta todos los certificados generados por la aplicación y
            fíltralos por estudiante, año, grado, expedidor o receptor.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="
              inline-flex items-center gap-2 rounded-full bg-[#3B5FC7]
              px-5 py-2.5 text-sm font-bold text-white shadow-sm transition
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
            onClick={handleClear}
            className="
              inline-flex items-center gap-2 rounded-full border
              border-[#3B5FC7]/25 bg-white px-5 py-2.5 text-sm font-bold
              text-[#2861C4] transition
              hover:border-[#3B5FC7]/50 hover:bg-[#EAF1FC]
              focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/25
              focus-visible:outline-none
              active:translate-y-px
            "
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Limpiar filtros
          </button>
        </div>

        <CertificateRepositoryTable
          rows={rows}
          isLoading={isLoading}
          hasSearched={hasSearched}
          onClearFilters={handleClear}
          onOpenFilters={() => setFiltersOpen(true)}
          onSelectRow={handleSelectRow}
        />

        {total > REPOSITORY_PAGE_SIZE && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onChange={handleGoto}
          />
        )}
      </div>

      <CertificateRepositoryFiltersDialog
        open={filtersOpen}
        filters={filters}
        onClose={() => setFiltersOpen(false)}
        onApply={handleApply}
      />
    </main>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Paginación del repositorio"
      className="
        flex flex-wrap items-center justify-between gap-3
        rounded-2xl border border-gray-200/80 bg-white
        px-4 py-3 shadow-[0_20px_50px_-30px_rgba(40,97,196,0.25)]
        sm:px-5
      "
    >
      <p className="text-xs text-gray-500">
        Mostrando{" "}
        <span className="font-bold text-[#1F2937]">
          {(page - 1) * REPOSITORY_PAGE_SIZE + 1}–
          {Math.min(page * REPOSITORY_PAGE_SIZE, total)}
        </span>{" "}
        de <span className="font-bold text-[#1F2937]">{total}</span> certificados
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="
            inline-flex h-9 items-center justify-center rounded-full
            bg-[#EAF1FC] px-4 text-xs font-bold text-[#2861C4] transition
            hover:bg-[#DDE9FB]
            focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
            focus-visible:outline-none
            disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400
          "
        >
          Anterior
        </button>

        <span className="min-w-[6rem] text-center text-xs font-bold text-[#1F2937] tabular-nums">
          Página {page} de {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="
            inline-flex h-9 items-center justify-center rounded-full
            bg-[#EAF1FC] px-4 text-xs font-bold text-[#2861C4] transition
            hover:bg-[#DDE9FB]
            focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
            focus-visible:outline-none
            disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400
          "
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
