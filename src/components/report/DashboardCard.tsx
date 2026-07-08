import { cn } from "@/lib/utils";

/** The brand accent, used for the primary CTA, active nav, and hero accents.
 *  Data-viz keeps its own category hues (this is the brand accent, not a data color). */
export const ACCENT = "#4971ff";
export const ACCENT_HOVER = "#3f63e0";

/** Shared primary-button treatment (the "Book a call" CTA) so the accent lives in one place. */
export const CTA_CLASS = "bg-[#4971ff] text-white hover:bg-[#3f63e0]";

/** The single card treatment every panel/tile shares: white, hairline cool-gray border,
 *  restrained radius, very soft two-layer shadow. No colored edges. */
export const CARD_CLASS =
  "rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_1px_rgba(15,23,42,0.04),0_2px_6px_rgba(15,23,42,0.05)]";

export function DashboardCard({
  title,
  subtitle,
  icon,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const hasHeader = title || subtitle || action;
  return (
    <section className={cn(CARD_CLASS, "flex flex-col", className)}>
      {hasHeader && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="min-w-0">
            {title && (
              <div className="flex items-center gap-2 text-slate-800">
                {icon}
                <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
              </div>
            )}
            {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn("min-w-0 flex-1 px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}
