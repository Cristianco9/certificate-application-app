"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

type Props = {
  open: boolean;
  /**
   * Dismiss the confirmation. The caller is responsible for clearing the
   * enrollment selection and routing back to the certificate search page.
   */
  onAccept: () => void;
};

/**
 * Terminal success confirmation shown after the delivery registration
 * succeeds.
 *
 * Behaviour is deliberately stricter than the other dialogs in this flow:
 *
 *   - No backdrop dismiss. The certificate has already been registered
 *     and printed; letting a stray click on the backdrop swallow the
 *     confirmation would leave the user unsure whether the operation
 *     completed.
 *   - No X button. Same reason — the only path forward is "Aceptar".
 *   - Escape does nothing. Enter activates the button (it is autoFocus-ed,
 *     so a keyboard user who just pressed Enter on the delivery form can
 *     press Enter again to acknowledge and return to the search page).
 *
 * Z-index is `70` — one above the cancel dialog's `60`, which itself
 * sits above the delivery dialog's `50`. This is the topmost layer in
 * the preview flow.
 */
export function CertificateSuccessDialog({ open, onAccept }: Props) {
  // Enter accepts — the dialog has exactly one action, so the natural
  // keyboard default is "acknowledge and continue".
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onAccept();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onAccept]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-dialog-title"
      className="fixed inset-0 z-[70] flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6 print:hidden"
    >
      {/*
       * Non-interactive backdrop — no `onClick`. The dialog is a
       * required acknowledgement, not a dismissable surface.
       */}
      <div
        aria-hidden="true"
        className="
          absolute inset-0 bg-[#1F2937]/50 backdrop-blur-sm
          animate-in fade-in [animation-duration:200ms]
        "
      />

      <div
        className="
          relative z-10 w-full max-w-sm overflow-hidden rounded-2xl
          bg-white px-7 py-8 text-center
          shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)]
          animate-in fade-in zoom-in-95 slide-in-from-bottom-4
          [animation-duration:250ms]
        "
      >
        {/* Icon — large green check with a soft halo. */}
        <div
          className="
            mx-auto flex h-20 w-20 items-center justify-center rounded-full
            bg-[#F0FDF4] ring-8 ring-[#DCFCE7]/60
          "
        >
          <CheckCircle2
            className="h-12 w-12 text-[#16A34A]"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </div>

        <h2
          id="success-dialog-title"
          className="
            mt-5 text-xl leading-tight font-extrabold tracking-tight
            text-[#1F2937] sm:text-2xl
          "
        >
          Certificado generado con éxito.
        </h2>

        <button
          type="button"
          onClick={onAccept}
          autoFocus
          className="
            mt-7 inline-flex h-10 min-w-[10rem] items-center justify-center
            rounded-full bg-[#3B5FC7] px-7 text-sm font-bold text-white
            shadow-sm transition
            hover:bg-[#3250a8]
            focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
            focus-visible:outline-none
            active:translate-y-px
          "
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
