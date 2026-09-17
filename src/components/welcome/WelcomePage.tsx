import Image from "next/image";
import Link from "next/link";

export function WelcomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#3B5FC7]">
      {/* Illustration — hidden below lg */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-y-0 right-0 hidden items-end
          justify-end lg:flex
          animate-in fade-in slide-in-from-right-8 fill-mode-backwards
          [animation-duration:1100ms] [animation-delay:150ms]
        "
      >
        <div className="relative h-[92vh] w-[62vw] translate-x-[8%] translate-y-[-2%]">
          <Image
            src="/images/hero/church.png"
            alt=""
            fill
            priority
            sizes="62vw"
            className="animate-float object-contain object-right-bottom"
          />
        </div>
      </div>

      {/* Content — centered below lg, left-aligned from lg up */}
      <div
        className="
          relative z-10 flex min-h-screen items-center justify-center
          px-8 sm:px-14 lg:justify-start lg:px-20 xl:px-24
        "
      >
        <div className="max-w-2xl">
          {/*
            w-fit shrink-wraps this column to the width of the <h1>.
            items-center then centers the button on that same width.
          */}
          <div className="flex w-fit flex-col items-center">
            <h1
              className="
                text-center text-3xl leading-[1.15] font-extrabold tracking-tight
                text-white uppercase sm:text-4xl lg:text-left lg:text-[2.75rem]
                animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards
                [animation-duration:800ms]
              "
            >
              Gestión de certificados
              <br />
              académicos históricos
            </h1>

            <div
              className="
                mt-10 sm:mt-12
                animate-in fade-in zoom-in-95 fill-mode-backwards
                [animation-duration:600ms] [animation-delay:300ms]
              "
            >
              <Link
                href="/login"
                className="
                  inline-flex h-11 items-center justify-center rounded-full
                  bg-white px-9 text-base font-bold text-[#3B5FC7]
                  shadow-[0_6px_0_0_rgba(0,0,0,0.12),0_10px_24px_-6px_rgba(0,0,0,0.35)]
                  transition-all duration-300 ease-out
                  hover:-translate-y-0.5
                  hover:shadow-[0_8px_0_0_rgba(0,0,0,0.12),0_14px_28px_-6px_rgba(0,0,0,0.4)]
                  focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:outline-none
                  active:translate-y-0 active:shadow-[0_3px_0_0_rgba(0,0,0,0.12),0_6px_12px_-4px_rgba(0,0,0,0.3)]
                "
              >
                Inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
