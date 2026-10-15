"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Calendar,
  Loader2,
  Phone as PhoneIcon,
  Plus,
  User,
  X,
} from "lucide-react";

import type { DocumentTypeOption } from "@/app/certificates/actions";

// ── Public shape ────────────────────────────────────────────────────────────

export type CertificateDeliveryFormData = {
  firstName: string;
  middleName: string;
  lastName: string;
  secondLastName: string;
  documentTypeId: string;
  documentNumber: string;
  /** UI-only. Not yet persisted — see `registerCertificateRecipientAction`. */
  relationship: string;
  address: string;
  phones: string[];
};

type Props = {
  open: boolean;
  documentTypes: DocumentTypeOption[];
  isLoadingDocumentTypes: boolean;
  isSubmitting: boolean;
  serverError: string | null;
  /**
   * Dismiss the dialog WITHOUT abandoning the certificate flow. Called by
   * the X button, the Escape key, and a click on the backdrop. Returns the
   * user to the preview page with the certificate still loaded.
   */
  onClose: () => void;
  /**
   * Abandon the certificate flow entirely. Called by the "Cancelar"
   * button — routes the user to the dashboard, discarding the current
   * certificate preview and the enrollment selection.
   */
  onCancel: () => void;
  onConfirm: (data: CertificateDeliveryFormData) => void;
};

// ── Static option sets ──────────────────────────────────────────────────────

const RELATIONSHIP_OPTIONS = [
  "Padre",
  "Madre",
  "Hermano(a)",
  "Tío(a)",
  "Abuelo(a)",
  "Primo(a)",
  "Cónyuge",
  "Acudiente",
  "Otro",
] as const;

// Mirrors backend patterns so users can't type something the API rejects.
const NAME_PATTERN = /^[\p{L}]{3,50}$/u;
const OPTIONAL_NAME_PATTERN = /^([\p{L}]{3,50})?$/u;
const DOCUMENT_NUMBER_PATTERN = /^(\d{6,10}|[a-zA-Z0-9]{6,20})$/;
const ADDRESS_PATTERN = /^[\p{L}\d #,-]{5,120}$/u;
const PHONE_PATTERN = /^(3\d{9}|(\+57)?\d{7,10})$/;

const MESSAGES = {
  firstName: "Ingresa el primer nombre (solo letras, mínimo 3 caracteres).",
  middleName: "El segundo nombre debe tener entre 3 y 50 letras, o dejarse vacío.",
  lastName: "Ingresa el primer apellido (solo letras, mínimo 3 caracteres).",
  secondLastName: "El segundo apellido debe tener entre 3 y 50 letras, o dejarse vacío.",
  documentType: "Selecciona el tipo de documento.",
  documentNumber: "Ingresa un documento válido (6 a 10 dígitos, o 6 a 20 alfanumérico).",
  relationship: "Selecciona el parentesco o relación con el estudiante.",
  address: "La dirección debe tener entre 5 y 120 caracteres.",
  phoneRequired: "Registra al menos un teléfono de contacto.",
  phoneInvalid: "Teléfono inválido (móvil de 10 dígitos o fijo de 7 a 10 dígitos).",
  confirm: "Debes confirmar que el certificado fue entregado al receptor registrado.",
} as const;

// ── Internal form state ─────────────────────────────────────────────────────

type FormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  secondLastName: string;
  documentTypeId: string;
  documentNumber: string;
  relationship: string;
  address: string;
  phones: string[];
  confirmed: boolean;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  middleName: "",
  lastName: "",
  secondLastName: "",
  documentTypeId: "",
  documentNumber: "",
  relationship: "",
  address: "",
  phones: [""],
  confirmed: false,
};

type FieldErrors = Partial<
  Record<"firstName" | "middleName" | "lastName" | "secondLastName" | "documentTypeId" | "documentNumber" | "relationship" | "address" | "phones" | "confirmed", string>
>;

// ── Component ───────────────────────────────────────────────────────────────

export function CertificateDeliveryDialog({
  open,
  documentTypes,
  isLoadingDocumentTypes,
  isSubmitting,
  serverError,
  onClose,
  onCancel,
  onConfirm,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [timestamp] = useState(() => new Date());

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, phones: [""] });
      setErrors({});
    }
  }, [open]);

  // Escape closes the dialog (matches the X button). The explicit
  // "Cancelar" button is the only control that abandons the whole flow.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !isSubmitting && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isSubmitting, onClose]);

  if (!open) return null;

  // ── Handlers ─────────────────────────────────────────────────────────────

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as keyof FieldErrors]) return prev;
      const next = { ...prev };
      delete next[key as keyof FieldErrors];
      return next;
    });
  }

  function updatePhone(index: number, value: string) {
    setForm((prev) => {
      const next = [...prev.phones];
      next[index] = value;
      return { ...prev, phones: next };
    });
    setErrors((prev) => {
      if (!prev.phones) return prev;
      const next = { ...prev };
      delete next.phones;
      return next;
    });
  }

  function addPhone() {
    setForm((prev) => ({ ...prev, phones: [...prev.phones, ""] }));
  }

  function removePhone(index: number) {
    setForm((prev) => {
      if (prev.phones.length <= 1) return prev;
      return { ...prev, phones: prev.phones.filter((_, i) => i !== index) };
    });
  }

  function validate(): FieldErrors {
    const e: FieldErrors = {};

    const firstName = form.firstName.trim();
    if (!firstName || !NAME_PATTERN.test(firstName)) e.firstName = MESSAGES.firstName;

    const middleName = form.middleName.trim();
    if (middleName && !OPTIONAL_NAME_PATTERN.test(middleName)) e.middleName = MESSAGES.middleName;

    const lastName = form.lastName.trim();
    if (!lastName || !NAME_PATTERN.test(lastName)) e.lastName = MESSAGES.lastName;

    const secondLastName = form.secondLastName.trim();
    if (secondLastName && !OPTIONAL_NAME_PATTERN.test(secondLastName))
      e.secondLastName = MESSAGES.secondLastName;

    if (!form.documentTypeId) e.documentTypeId = MESSAGES.documentType;

    const documentNumber = form.documentNumber.trim();
    if (!documentNumber || !DOCUMENT_NUMBER_PATTERN.test(documentNumber))
      e.documentNumber = MESSAGES.documentNumber;

    if (!form.relationship) e.relationship = MESSAGES.relationship;

    const address = form.address.trim();
    if (!address || !ADDRESS_PATTERN.test(address)) e.address = MESSAGES.address;

    const phones = form.phones.map((p) => p.trim()).filter(Boolean);
    if (phones.length === 0) {
      e.phones = MESSAGES.phoneRequired;
    } else if (!phones.every((p) => PHONE_PATTERN.test(p))) {
      e.phones = MESSAGES.phoneInvalid;
    }

    if (!form.confirmed) e.confirmed = MESSAGES.confirm;

    return e;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const next = validate();
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    onConfirm({
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim(),
      lastName: form.lastName.trim(),
      secondLastName: form.secondLastName.trim(),
      documentTypeId: form.documentTypeId,
      documentNumber: form.documentNumber.trim(),
      relationship: form.relationship,
      address: form.address.trim(),
      phones: form.phones.map((p) => p.trim()).filter(Boolean),
    });
  }

  // ── Derived values ──────────────────────────────────────────────────────

  const formattedDate = timestamp.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Bogota",
  });

  const formattedTime = timestamp.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  });

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6 print:hidden"
    >
      {/* Backdrop — treated like X: dismiss the dialog, keep the flow. */}
      <div
        aria-hidden="true"
        onClick={() => !isSubmitting && onClose()}
        className="
          absolute inset-0 bg-[#1F2937]/50 backdrop-blur-sm
          animate-in fade-in [animation-duration:200ms]
        "
      />

      {/* Dialog */}
      <div
        className="
          relative z-10 flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden
          rounded-2xl border-2 border-[#2861C4] bg-white
          shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)]
          animate-in fade-in zoom-in-95 slide-in-from-bottom-4
          [animation-duration:250ms]
        "
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <h2
              id="delivery-dialog-title"
              className="text-xl font-extrabold tracking-tight text-[#2861C4] sm:text-2xl"
            >
              Registro de entrega
            </h2>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Complete la información de la persona que ha recibido el
              certificado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar registro de entrega"
            className="
              -mt-1 rounded-md p-2 text-[#E5484D] transition
              hover:bg-[#FEF1F1]
              focus-visible:ring-4 focus-visible:ring-[#E5484D]/20
              focus-visible:outline-none
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={submit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            {/* ── Información del receptor ─────────────────────────── */}
            <section>
              <header className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF1FC] text-[#2861C4]"
                >
                  <User className="h-5 w-5" strokeWidth={2} />
                </span>
                <h3 className="text-base font-extrabold tracking-tight text-[#2861C4] sm:text-lg">
                  Información del receptor
                </h3>
              </header>

              {/*
               * Row 1 — full legal name, in reading order.
               *
               * 4 columns on lg, 2 on sm, 1 on mobile. Grouping all four
               * name fields on a single row matches the way the
               * recipient's name is written on the certificate and on the
               * paper delivery receipt.
               */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <TextField
                  id="delivery-firstName"
                  label="Primer nombre"
                  required
                  value={form.firstName}
                  error={errors.firstName}
                  onChange={(v) => update("firstName", v)}
                />
                <TextField
                  id="delivery-middleName"
                  label="Segundo nombre"
                  value={form.middleName}
                  error={errors.middleName}
                  onChange={(v) => update("middleName", v)}
                />
                <TextField
                  id="delivery-lastName"
                  label="Primer apellido"
                  required
                  value={form.lastName}
                  error={errors.lastName}
                  onChange={(v) => update("lastName", v)}
                />
                <TextField
                  id="delivery-secondLastName"
                  label="Segundo apellido"
                  value={form.secondLastName}
                  error={errors.secondLastName}
                  onChange={(v) => update("secondLastName", v)}
                />
              </div>

              {/*
               * Row 2 — identity + relationship to the student.
               *
               * 3 columns on lg, 2 on sm, 1 on mobile. Grouped together
               * because these three fields describe *how the recipient is
               * identified*: document type, document number, and the
               * relationship to the certificate's owner.
               */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SelectField
                  id="delivery-documentTypeId"
                  label="Tipo de documento"
                  required
                  value={form.documentTypeId}
                  error={errors.documentTypeId}
                  onChange={(v) => update("documentTypeId", v)}
                  options={documentTypes.map((d) => ({
                    value: d.id,
                    label: d.name,
                  }))}
                  placeholder="Seleccione…"
                  loading={isLoadingDocumentTypes}
                />
                <TextField
                  id="delivery-documentNumber"
                  label="Documento de identidad"
                  required
                  value={form.documentNumber}
                  error={errors.documentNumber}
                  onChange={(v) => update("documentNumber", v)}
                />
                <SelectField
                  id="delivery-relationship"
                  label="Parentesco o relación"
                  required
                  value={form.relationship}
                  error={errors.relationship}
                  onChange={(v) => update("relationship", v)}
                  options={RELATIONSHIP_OPTIONS.map((r) => ({
                    value: r,
                    label: r,
                  }))}
                  placeholder="Seleccione…"
                />
              </div>

              {/* Phones — dynamic list */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#1F2937]">
                    Teléfonos
                    <span className="ml-0.5 text-[#E5484D]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={addPhone}
                    className="
                      inline-flex items-center gap-1.5 rounded-md
                      px-2.5 py-1 text-xs font-semibold text-[#2861C4]
                      transition hover:bg-[#EAF1FC]
                      focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/25
                      focus-visible:outline-none
                    "
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Agregar teléfono
                  </button>
                </div>

                <ul className="flex flex-col gap-2">
                  {form.phones.map((phone, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="relative flex-1">
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                        >
                          <PhoneIcon className="h-4 w-4" strokeWidth={1.8} />
                        </span>
                        <input
                          id={`delivery-phone-${index}`}
                          type="tel"
                          inputMode="tel"
                          autoComplete="off"
                          spellCheck={false}
                          value={phone}
                          onChange={(e) => updatePhone(index, e.target.value)}
                          placeholder="3001234567"
                          className="
                            h-10 w-full rounded-md border border-gray-300 bg-white
                            pr-3 pl-9 text-sm text-[#1F2937]
                            transition outline-none placeholder:text-gray-400
                            focus:border-[#3B5FC7] focus:ring-4 focus:ring-[#3B5FC7]/15
                          "
                        />
                      </div>
                      {form.phones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePhone(index)}
                          aria-label={`Eliminar teléfono ${index + 1}`}
                          className="
                            flex h-10 w-10 shrink-0 items-center justify-center
                            rounded-md text-[#E5484D] transition
                            hover:bg-[#FEF1F1]
                            focus-visible:ring-4 focus-visible:ring-[#E5484D]/25
                            focus-visible:outline-none
                          "
                        >
                          <X className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>

                {errors.phones && (
                  <p className="text-[11px] leading-snug text-[#B4242A]">
                    {errors.phones}
                  </p>
                )}
              </div>

              {/* Dirección */}
              <div className="mt-4">
                <TextField
                  id="delivery-address"
                  label="Dirección"
                  required
                  value={form.address}
                  error={errors.address}
                  onChange={(v) => update("address", v)}
                />
              </div>
            </section>

            {/* ── Información de entrega ───────────────────────────── */}
            <section className="mt-8">
              <header className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF1FC] text-[#2861C4]"
                >
                  <Calendar className="h-5 w-5" strokeWidth={2} />
                </span>
                <h3 className="text-base font-extrabold tracking-tight text-[#2861C4] sm:text-lg">
                  Información de entrega
                </h3>
              </header>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadonlyField
                  label="Fecha de entrega"
                  value={formattedDate}
                />
                <ReadonlyField label="Hora" value={formattedTime} />
              </div>
            </section>

            {/* ── Confirmación ──────────────────────────────────────── */}
            <div className="mt-6">
              <label
                htmlFor="delivery-confirm"
                className={`
                  flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition
                  ${
                    errors.confirmed
                      ? "border-[#E5484D] bg-[#FEF1F1]"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                  }
                `}
              >
                <input
                  id="delivery-confirm"
                  type="checkbox"
                  checked={form.confirmed}
                  onChange={(e) => update("confirmed", e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#3B5FC7]"
                />
                <span className="text-sm leading-snug text-[#1F2937]">
                  Confirmo que el certificado ha sido entregado al receptor
                  registrado.
                </span>
              </label>
              {errors.confirmed && (
                <p className="mt-1.5 text-[11px] leading-snug text-[#B4242A]">
                  {errors.confirmed}
                </p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="mt-5">
                <div
                  role="alert"
                  className="
                    flex items-start gap-3 rounded-md border-l-4 border-[#E5484D]
                    bg-[#FEF1F1] px-4 py-3
                  "
                >
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#E5484D]"
                  />
                  <p className="text-sm leading-snug font-medium text-[#B4242A]">
                    {serverError}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            {/*
             * "Cancelar" abandons the whole certificate flow — the caller
             * (CertificatePreviewPage) routes to /dashboard. The X button
             * in the header remains the "just close the dialog" control.
             */}
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="
                inline-flex h-10 items-center justify-center rounded-md
                border border-gray-300 bg-white px-6 text-sm font-semibold
                text-[#1F2937] transition
                hover:bg-gray-50
                focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/15
                focus-visible:outline-none
                active:translate-y-px
                disabled:cursor-not-allowed disabled:opacity-60
              "
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="
                inline-flex h-10 items-center justify-center gap-2 rounded-full
                bg-[#3B5FC7] px-7 text-sm font-bold text-white
                shadow-sm transition
                hover:bg-[#3250a8]
                focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
                focus-visible:outline-none
                active:translate-y-px
                disabled:cursor-not-allowed disabled:opacity-70
              "
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Registrando…" : "Registrar entrega"}
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
  required = false,
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
        {required && (
          <span className="ml-0.5 text-[#E5484D]" aria-hidden="true">
            *
          </span>
        )}
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
  error,
  required = false,
  placeholder = "Seleccione…",
  loading = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  required?: boolean;
  placeholder?: string;
  loading?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-[#1F2937]">
        {label}
        {required && (
          <span className="ml-0.5 text-[#E5484D]" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <select
          id={id}
          name={id}
          value={value}
          disabled={loading}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`
            h-10 w-full appearance-none rounded-md border bg-white
            pr-9 pl-3 text-sm text-[#1F2937]
            transition outline-none
            focus:ring-4
            disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400
            ${
              error
                ? "border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]/15"
                : "border-gray-300 focus:border-[#3B5FC7] focus:ring-[#3B5FC7]/15"
            }
          `}
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
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400"
          >
            <path
              d="M6 8l4 4 4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-[11px] leading-snug text-[#B4242A]">
          {error}
        </p>
      )}
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold text-[#1F2937]">
        {label}
      </span>
      <div
        className="
          flex h-10 items-center rounded-md border border-gray-200 bg-gray-50
          px-3 text-sm text-gray-700
        "
      >
        {value}
      </div>
    </div>
  );
}
