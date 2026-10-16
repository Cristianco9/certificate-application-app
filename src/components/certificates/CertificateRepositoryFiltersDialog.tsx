"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";

import {
  fetchDocumentTypesAction,
  fetchGradesAction,
  type DocumentTypeOption,
  type GradeOption,
} from "@/app/certificates/actions";

import { getToken } from "@/lib/auth/token";
import { DOCUMENT_NUMBER_PATTERN } from "@/lib/regex/identity";

import {
  EMPTY_REPOSITORY_FILTERS,
  type CertificateRepositoryFilters,
} from "@/types/certificate-repository";

// ── Static options ─────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 1900 + 1 },
  (_, i) => {
    const y = String(CURRENT_YEAR - i);
    return { value: y, label: y };
  }
);

const GROUP_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const JORNADA_OPTIONS = [
  { value: "Diurna", label: "Diurna" },
  { value: "Nocturna", label: "Nocturna" },
];

type Props = {
  open: boolean;
  filters: CertificateRepositoryFilters;
  onClose: () => void;
  onApply: (filters: CertificateRepositoryFilters) => void;
};

export function CertificateRepositoryFiltersDialog({
  open,
  filters,
  onClose,
  onApply,
}: Props) {
  const [draft, setDraft] = useState(filters);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeOption[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  useEffect(() => {
    if (!open || documentTypes.length || grades.length) return;
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    setLoadingCatalogs(true);
    Promise.all([fetchDocumentTypesAction(token), fetchGradesAction(token)])
      .then(([dt, gr]) => {
        if (cancelled) return;
        setDocumentTypes(dt);
        setGrades(gr);
      })
      .finally(() => !cancelled && setLoadingCatalogs(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function update<K extends keyof CertificateRepositoryFilters>(
    key: K,
    value: CertificateRepositoryFilters[K]
  ) {
    setDraft((c) => ({ ...c, [key]: value }));
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Trim every string field before applying. No required fields here —
    // the repository is a browse-everything view, not a search form with
    // a mandatory anchor like the student search.
    const cleaned: CertificateRepositoryFilters = { ...draft };
    for (const key of Object.keys(cleaned) as Array<keyof CertificateRepositoryFilters>) {
      const value = cleaned[key];
      if (typeof value === "string") {
        (cleaned as Record<string, unknown>)[key] = value.trim();
      }
    }

    onApply(cleaned);
  }

  const gradeOptions = grades.map((g) => ({
    value: g.id,
    label: `${g.sequence} - ${g.name}`,
  }));

  const documentTypeOptions = documentTypes.map((d) => ({
    value: d.id,
    label: d.name,
  }));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="repo-filters-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-[#1F2937]/40 backdrop-blur-sm animate-in fade-in [animation-duration:200ms]"
      />

      <div
        className="
          relative z-10 flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden
          rounded-2xl border border-gray-200 bg-white
          shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)]
          animate-in fade-in zoom-in-95 slide-in-from-bottom-4
          [animation-duration:250ms]
        "
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <h2
              id="repo-filters-title"
              className="text-xl font-extrabold tracking-tight text-[#2861C4]"
            >
              Filtros de búsqueda
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Todos los campos son opcionales. Combínalos para acotar el
              historial de certificados.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar filtros"
            className="
              -mt-1 rounded-md p-2 text-[#E5484D] transition
              hover:bg-[#FEF1F1]
              focus-visible:ring-4 focus-visible:ring-[#E5484D]/20
              focus-visible:outline-none
            "
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            {/* Row 1 — student name */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextField
                id="repo-firstName"
                label="Primer nombre"
                value={draft.firstName}
                onChange={(v) => update("firstName", v)}
              />
              <TextField
                id="repo-secondName"
                label="Segundo nombre"
                value={draft.secondName}
                onChange={(v) => update("secondName", v)}
              />
              <TextField
                id="repo-firstLastName"
                label="Primer apellido"
                value={draft.firstLastName}
                onChange={(v) => update("firstLastName", v)}
              />
              <TextField
                id="repo-secondLastName"
                label="Segundo apellido"
                value={draft.secondLastName}
                onChange={(v) => update("secondLastName", v)}
              />
            </div>

            {/* Row 2 — document + catalog + year */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextField
                id="repo-documentNumber"
                label="Documento de identidad"
                value={draft.documentNumber}
                onChange={(v) => update("documentNumber", v)}
              />
              <SelectField
                id="repo-documentTypeId"
                label="Tipo de documento"
                value={draft.documentTypeId}
                onChange={(v) => update("documentTypeId", v)}
                options={documentTypeOptions}
                placeholder="Todos"
                loading={loadingCatalogs}
              />
              <SelectField
                id="repo-year"
                label="Último año cursado"
                value={draft.year || null}
                onChange={(v) => update("year", v ?? "")}
                options={YEAR_OPTIONS}
                placeholder="Todos"
              />
            </div>

            {/* Row 3 — grade + group + jornada */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SelectField
                id="repo-gradeId"
                label="Grado cursado"
                value={draft.gradeId}
                onChange={(v) => update("gradeId", v)}
                options={gradeOptions}
                placeholder="Todos"
                loading={loadingCatalogs}
              />
              <SelectField
                id="repo-group"
                label="Grupo"
                value={draft.group}
                onChange={(v) => update("group", v)}
                options={GROUP_OPTIONS}
                placeholder="Todos"
              />
              <SelectField
                id="repo-jornada"
                label="Jornada"
                value={draft.jornada}
                onChange={(v) =>
                  update("jornada", (v as "Diurna" | "Nocturna" | null) ?? null)
                }
                options={JORNADA_OPTIONS}
                placeholder="Todas"
              />
            </div>

            {/* Row 4 — certificate + recipient */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextField
                id="repo-actNumber"
                label="N° de certificado"
                value={draft.actNumber}
                onChange={(v) => update("actNumber", v)}
              />
              <TextField
                id="repo-recipientName"
                label="Recibido por"
                value={draft.recipientName}
                onChange={(v) => update("recipientName", v)}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <button
              type="button"
              onClick={() => setDraft(EMPTY_REPOSITORY_FILTERS)}
              className="
                inline-flex items-center justify-center rounded-md px-4 py-2
                text-xs font-semibold text-gray-600 transition
                hover:bg-gray-100 hover:text-[#1F2937]
                focus-visible:ring-4 focus-visible:ring-gray-200 focus-visible:outline-none
              "
            >
              Restablecer
            </button>

            <button
              type="submit"
              className="
                inline-flex items-center justify-center gap-2 rounded-full
                bg-[#3B5FC7] px-7 py-2.5 text-sm font-bold text-white
                shadow-sm transition
                hover:bg-[#3250a8]
                focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
                focus-visible:outline-none
                active:translate-y-px
              "
            >
              <Search className="h-4 w-4" />
              Buscar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Field components (identical to CertificateSearchFiltersDialog) ──────────

function TextField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-[#1F2937]">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        className="
          h-10 w-full rounded-md border border-gray-300 bg-white
          px-3 text-sm text-[#1F2937] transition outline-none
          placeholder:text-gray-400
          focus:border-[#3B5FC7] focus:ring-4 focus:ring-[#3B5FC7]/15
        "
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Todos",
  loading = false,
}: {
  id: string;
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  loading?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-[#1F2937]">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value ?? ""}
          disabled={loading}
          onChange={(e) => onChange(e.target.value || null)}
          className="
            h-10 w-full appearance-none rounded-md border border-gray-300
            bg-white pr-9 pl-3 text-sm text-[#1F2937]
            transition outline-none
            focus:border-[#3B5FC7] focus:ring-4 focus:ring-[#3B5FC7]/15
            disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400
          "
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {loading ? (
          <Loader2
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
          />
        ) : (
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
        )}
      </div>
    </div>
  );
}
