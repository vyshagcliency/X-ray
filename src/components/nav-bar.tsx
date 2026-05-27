import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";

const STEPS = [
  "Enter your details",
  "Upload 4 CSVs",
  "Get your report",
] as const;

interface NavBarProps {
  currentStep?: 1 | 2 | 3;
  showCta?: boolean;
}

export function NavBar({ currentStep, showCta }: NavBarProps) {
  return (
    <div className="bg-[#0f172a]">
      {/* Main bar */}
      <nav className="h-12 border-b border-white/[0.06] lg:h-14">
        <div className="mx-auto flex h-full items-center justify-between px-8 lg:px-12">
          <a href="https://baslix.com" className="flex items-center gap-2.5">
            <Image
              src="/xray/logo.png"
              alt="Baslix"
              width={32}
              height={32}
              className="size-8"
            />
            <span className="text-xl font-bold tracking-tight text-white">
              baslix
            </span>
          </a>
          {showCta && (
            <Link
              href="/start"
              className="rounded-md bg-white px-4 py-1.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
            >
              Get Started
            </Link>
          )}
        </div>
      </nav>

      {/* Step indicator */}
      {currentStep && (
        <div className="border-b border-white/[0.06] py-3">
          <div className="mx-auto flex items-center justify-center gap-3 px-6">
            {STEPS.map((label, i) => {
              const stepNum = (i + 1) as 1 | 2 | 3;
              const isActive = stepNum === currentStep;
              const isCompleted = stepNum < currentStep;

              return (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                        isCompleted
                          ? "bg-emerald-500 text-white"
                          : isActive
                            ? "bg-white text-slate-900"
                            : "bg-white/10 text-white/40"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="size-3.5" strokeWidth={3} />
                      ) : (
                        stepNum
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        isActive
                          ? "font-medium text-white"
                          : isCompleted
                            ? "text-white/60"
                            : "text-white/40"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`h-px w-8 ${
                        isCompleted ? "bg-emerald-500/50" : "bg-white/10"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
