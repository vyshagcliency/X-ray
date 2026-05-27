import Link from "next/link";
import Image from "next/image";

interface NavBarProps {
  showCta?: boolean;
}

export function NavBar({ showCta }: NavBarProps) {
  return (
    <nav className="h-12 border-b border-white/[0.06] bg-[#0f172a] lg:h-14">
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
  );
}
