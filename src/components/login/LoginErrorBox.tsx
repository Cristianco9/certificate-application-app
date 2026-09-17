import { AlertTriangle } from "lucide-react";

type LoginErrorBoxProps = {
  message: string;
};

export function LoginErrorBox({ message }: LoginErrorBoxProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="
        flex items-start gap-3 rounded-md border-l-4 border-[#E5484D]
        bg-[#FEF1F1] px-4 py-3
        animate-in fade-in zoom-in-95 fill-mode-backwards
        [animation-duration:300ms]
      "
    >
      <AlertTriangle
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-[#E5484D]"
      />
      <p className="text-sm font-medium leading-snug text-[#B4242A]">
        {message}
      </p>
    </div>
  );
}
