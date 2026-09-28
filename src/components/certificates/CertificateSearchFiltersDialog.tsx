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
  STUDENT_FIRST_LAST_NAME_PATTERN,
  STUDENT_FIRST_NAME_PATTERN,
  STUDENT_MIDDLE_NAME_PATTERN,
  STUDENT_SECOND_LAST_NAME_PATTERN,
} from "@/lib/regex/student";

import {
  EMPTY_CERTIFICATE_FILTERS,
  type CertificateSearchFilters,
  type Shift,
} from "@/types/certificate-search";

// ── Static option sets ──────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

/** Years 1900 → current, newest first. */
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 1900 + 1 },
  (_, i) => {
    const year = String(CURRENT_YEAR - i);
    return { value: year, label: year };
  }
);

/** Groups 1–10, displayed as "1", "2", … "10". */
const GROUP_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const JORNADA_OPTIONS: Array<{ value: Shift; label: string }> = [
  { value: "DIURNA", label: "Diurna" },
  { value: "NOCTURNA", label: "Nocturna" },
];

// ── Validation ──────────────────────────────────────────────────────────────

type FieldErrors = Partial<Record<keyof CertificateSearchFilters, string>>;

function validate(f: CertificateSearchFilters): FieldErrors {
  const e: FieldErrors = {};

  const firstName = f.firstName.trim();
  if (!firstName) e.firstName = "El primer nombre es obligatorio.";
  else if (!STUDENT_FIRST_NAME_PATTERN.test(firstName))
    e.firstName = "Solo letras, entre 3 y 50 caracteres.";

  const firstLastName = f.firstLastName.trim();
  if (!firstLastName) e.firstLastName = "El primer apellido es obligatorio.";
  else if (!STUDENT_FIRST_LAST_NAME_PATTERN.test(firstLastName))
    e.firstLastName = "Solo letras, entre 3 y 50 caracteres.";

  const secondName = f.secondName.trim();
  if (secondName && !STUDENT_MIDDLE_NAME_PATTERN.test(secondName))
    e.secondName = "Solo letras, entre 3 y 50 caracteres.";

  const secondLastName = f.secondLastName.trim();
  if (secondLastName && !STUDENT_SECOND_LAST_NAME_PATTERN.test(secondLastName))
    e.secondLastName = "Solo letras, entre 3 y 50 caracteres.";

  const documentNumber = f.documentNumber.trim();
  if (documentNumber && !DOCUMENT_NUMBER_PATTERN.test(documentNumber))
    e.documentNumber =
      "Cédula (6 a 10 dígitos) o documento alfanumérico (6 a 20 caracteres).";

  // NOTE: birthplace is intentionally NOT validated — the backend
  // exposes no birthplace regex. See @/lib/regex/student.

  return e;
}

// ── Component ───────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  filters: CertificateSearchFilters;
  onClose: () => void;
  onApply: (filters: CertificateSearchFilters) => void;
};

export function CertificateSearchFiltersDialog({
  open,
  filters,
  onClose,
  onApply,
}: Props) {
  const [draft, setDraft] = useState(filters);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [documentTypes, setDocumentTypes] = useState<DocumentTypeOption[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  // Sync draft with applied filters whenever the dialog reopens.
  useEffect(() => {
    if (open) {
      setDraft(filters);
      setErrors({});
    }
  }, [open, filters]);

  // Fetch catalogs once per page session.
  useEffect(() => {
    if (!open) return;
    if (documentTypes.length && grades.length) return;

    let cancelled = false;
    const token = getToken();
    if (!token) return;

    setLoadingCatalogs(true);
    Promise.all([fetchDocumentTypesAction(token), fetchGradesAction(token)])
      .then(([dt, gr]) => {
        if (cancelled) return;
        setDocumentTypes(dt);
        setGrades(gr);
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalogs(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function update<K extends keyof CertificateSearchFilters>(
    key: K,
    value: CertificateSearchFilters[K]
  ) {
    setDraft((c) => ({ ...c, [key]: value }));
    setErrors((c) => {
      if (!c[key]) return c;
      const next = { ...c };
      delete next[key];
      return next;
    });
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = validate(draft);
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    onApply({
      ...draft,
      firstName: draft.firstName.trim(),
      firstLastName: draft.firstLastName.trim(),
      secondName: draft.secondName.trim(),
      secondLastName: draft.secondLastName.trim(),
      documentNumber: draft.documentNumber.trim(),
      birthplace: draft.birthplace.trim(),
    });
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
      aria-labelledby="filters-dialog-title"
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
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <h2
              id="filters-dialog-title"
              className="text-xl font-extrabold tracking-tight text-[#2861C4]"
            >
              Filtros de búsqueda
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              El primer nombre y el primer apellido son obligatorios.
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

        {/* Body */}
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            {/* Row 1 — the four name fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextField
                id="firstName"
                label="Primer nombre"
                required
                value={draft.firstName}
                error={errors.firstName}
                onChange={(v) => update("firstName", v)}
              />
              <TextField
                id="secondName"
                label="Segundo nombre"
                value={draft.secondName}
                error={errors.secondName}
                onChange={(v) => update("secondName", v)}
              />
              <TextField
                id="firstLastName"
                label="Primer apellido"
                required
                value={draft.firstLastName}
                error={errors.firstLastName}
                onChange={(v) => update("firstLastName", v)}
              />
              <TextField
                id="secondLastName"
                label="Segundo apellido"
                value={draft.secondLastName}
                error={errors.secondLastName}
                onChange={(v) => update("secondLastName", v)}
              />
            </div>

            {/* Row 2 — document, catalog, year */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextField
                id="documentNumber"
                label="Documento de identidad"
                value={draft.documentNumber}
                error={errors.documentNumber}
                onChange={(v) => update("documentNumber", v)}
              />
              <SelectField
                id="documentTypeId"
                label="Tipo de documento"
                value={draft.documentTypeId}
                onChange={(v) => update("documentTypeId", v)}
                options={documentTypeOptions}
                placeholder="Todos"
                loading={loadingCatalogs}
              />
              <SelectField
                id="lastAcademicYear"
                label="Último año cursado"
                value={draft.lastAcademicYear || null}
                onChange={(v) => update("lastAcademicYear", v ?? "")}
                options={YEAR_OPTIONS}
                placeholder="Todos"
              />
            </div>

            {/* Row 3 — grade, group, birthplace */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SelectField
                id="gradeId"
                label="Grado cursado"
                value={draft.gradeId}
                onChange={(v) => update("gradeId", v)}
                options={gradeOptions}
                placeholder="Todos"
                loading={loadingCatalogs}
              />
              <SelectField
                id="group"
                label="Grupo"
                value={draft.group}
                onChange={(v) => update("group", v)}
                options={GROUP_OPTIONS}
                placeholder="Todos"
              />
              <TextField
                id="birthplace"
                label="Lugar de nacimiento"
                value={draft.birthplace}
                onChange={(v) => update("birthplace", v)}
              />
            </div>

            {/* Row 4 — jornada (not in the mockup, added on request) */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SelectField
                id="jornada"
                label="Jornada"
                value={draft.jornada}
                onChange={(v) => update("jornada", v as Shift | null)}
                options={JORNADA_OPTIONS}
                placeholder="Todas"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <button
              type="button"
              onClick={() => {
                setDraft(EMPTY_CERTIFICATE_FILTERS);
                setErrors({});
              }}
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

// ── Field components ────────────────────────────────────────────────────────

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-[#1F2937]">
        {label}
        {required && <span className="ml-0.5 text-[#E5484D]" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        value={value}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`
          h-10 w-full rounded-md border bg-white px-3 text-sm text-[#1F2937]
          transition outline-none placeholder:text-gray-400 focus:ring-4
          ${
            error
              ? "border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]/15"
              : "border-gray-300 focus:border-[#3B5FC7] focus:ring-[#3B5FC7]/15"
          }
        `}
      />
      {error && (
        <p id={`${id}-error`} className="text-[11px] leading-snug text-[#B4242A]">
          {error}
        </p>
      )}
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
          name={id}
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
