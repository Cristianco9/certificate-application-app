"use client";

import { useEffect } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  isProcessing?: boolean;
  /**
   * Dismiss the dialog WITHOUT cancelling the certificate. Wired to the
   * X button, Escape, and a click on the backdrop. Returns the user to
   * whatever they were doing before — the preview page, or the delivery
   * registration form if the dialog was opened from there.
   */
  onClose: () => void;
  /**
   * Confirm the cancellation. The caller is responsible for clearing the
   * enrollment selection and routing to the dashboard.
   */
  onConfirm: () => void;
};

/**
 * Confirmation dialog shown before abandoning the certificate flow.
 *
 * Replaces the previous "click Cancelar → immediately redirect" behavior.
 * The certificate is a legal document and its enrollment selection may
 * have taken the user several minutes to assemble — a silent discard is
 * too easy to trigger by accident.
 *
 * Z-index is `60` (one above the delivery dialog's `50`) so this dialog
 * can be layered on top of the delivery form when the user cancels from
 * inside that form.
 */
export function CertificateCancelDialog({
  open,
  isProcessing = false,
  onClose,
  onConfirm,
}: Props) {
  // Escape closes the dialog — same as the X button, NOT the same as
  // confirming.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && !isProcessing && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isProcessing, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
      className="fixed inset-0 z-[60] flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6 print:hidden"
    >
      {/* Backdrop — treated like the X button: dismiss, do not cancel. */}
      <div
        aria-hidden="true"
        onClick={() => !isProcessing && onClose()}
        className="
          absolute inset-0 bg-[#1F2937]/50 backdrop-blur-sm
          animate-in fade-in [animation-duration:200ms]
        "
      />

      <div
        className="
          relative z-10 w-full max-w-md overflow-hidden
          rounded-2xl border-2 border-[#E5484D] bg-white
          shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)]
          animate-in fade-in zoom-in-95 slide-in-from-bottom-4
          [animation-duration:250ms]
        "
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF1F1] text-[#E5484D]"
            >
              <AlertTriangle className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div>
              <h2
                id="cancel-dialog-title"
                className="text-lg font-extrabold tracking-tight text-[#1F2937]"
              >
                ¿Cancelar el certificado?
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Cerrar confirmación"
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
        <div className="px-5 py-5">
          <p className="text-sm leading-relaxed text-gray-600">
            Si cancelas, regresarás al panel principal y perderás la
            selección de matrículas que hiciste para este certificado.
            Ningún cambio se guardará.
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="
              inline-flex h-10 items-center justify-center rounded-md
              border border-gray-300 bg-white px-5 text-sm font-semibold
              text-[#1F2937] transition
              hover:bg-gray-50
              focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/15
              focus-visible:outline-none
              active:translate-y-px
              disabled:cursor-not-allowed disabled:opacity-60
            "
          >
            Continuar con el certificado
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="
              inline-flex h-10 items-center justify-center gap-2 rounded-md
              bg-[#E5484D] px-5 text-sm font-bold text-white
              transition
              hover:bg-[#C93A3F]
              focus-visible:ring-4 focus-visible:ring-[#E5484D]/30
              focus-visible:outline-none
              active:translate-y-px
              disabled:cursor-not-allowed disabled:opacity-70
            "
          >
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            Sí, cancelar certificado
          </button>
        </div>
      </div>
    </div>
  );
}
