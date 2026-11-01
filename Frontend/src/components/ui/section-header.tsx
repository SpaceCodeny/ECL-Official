import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
}

export function SectionHeader({ title, description, href, hrefLabel = "Ver tudo" }: SectionHeaderProps) {
  return (
    <div className="mb-4 sm:mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-tight text-paper">
          {title}
        </h2>
        {description ? <p className="text-xs sm:text-sm text-muted">{description}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium uppercase tracking-wide text-gold transition-colors hover:text-gold-light self-start sm:self-auto"
        >
          {hrefLabel}
          <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
