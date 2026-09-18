import Image from "next/image";

type AuthBrandPanelProps = {
  /** Marketing subtitle. The title is fixed — it is the product's identity. */
  subtitle: string;
};

/**
 * Right-hand branding panel shared by every page in the auth flow
 * (login, forgot-password, and any future auth screen).
 *
 * Hidden below `lg` — the form panel takes the full viewport on smaller
 * screens. The illustration is decorative and the whole panel is
 * `aria-hidden`, so it is invisible to assistive tech.
 */
export function AuthBrandPanel({ subtitle }: AuthBrandPanelProps) {
  return (
    <aside
      aria-hidden="true"
      className="relative hidden overflow-hidden bg-[#3B5FC7] lg:flex lg:w-1/2"
    >
      <div
        className="
          relative z-10 flex flex-col px-12 py-14 xl:px-16
          animate-in fade-in slide-in-from-left-6 fill-mode-backwards
          [animation-duration:800ms] [animation-delay:150ms]
        "
      >
        <h2 className="max-w-md text-2xl leading-tight font-extrabold text-white xl:text-3xl">
          Gestión de certificados académicos históricos
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/85">
          {subtitle}
        </p>
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-end justify-end">
        <div
          className="
            relative h-[80%] w-[88%] translate-x-[6%] translate-y-[-2%]
            animate-in fade-in slide-in-from-right-8 fill-mode-backwards
            [animation-duration:1100ms] [animation-delay:150ms]
          "
        >
          <Image
            src="/images/hero/church.png"
            alt=""
            fill
            priority
            sizes="50vw"
            className="animate-float object-contain object-right-bottom"
          />
        </div>
      </div>
    </aside>
  );
}
