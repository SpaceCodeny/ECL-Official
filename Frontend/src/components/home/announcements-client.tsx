"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useAnnouncements } from "@/hooks/use-home";
import { announcementTypeLabel } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import type { Announcement } from "@/types/domain";

const typeBadgeVariant = {
  GENERAL: "neutral",
  REGISTRATION_OPEN: "success",
  RESULT: "gold",
  SCHEDULE: "neutral",
  ANNOUNCEMENT: "warning",
} as const;

export function AnnouncementsClient() {
  const { data, isLoading, isError, refetch } = useAnnouncements(20);

  const items: Announcement[] = data?.data ?? [];

  return (
    <div>
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !items.length ? (
        <EmptyState icon={Megaphone} title="Sem comunicados" description="Comunicados e notícias serão publicados aqui." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <Link key={a.id} href={`/announcements/${a.id}`} className="card-ecl flex flex-col gap-3 p-5 transition-colors hover:border-gold/40">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={typeBadgeVariant[a.type]}>{announcementTypeLabel[a.type]}</Badge>
                <span className="shrink-0 text-xs text-muted">{formatDate(a.publishedAt)}</span>
              </div>
              <h3 className="font-display font-semibold uppercase tracking-tight text-paper transition-colors group-hover:text-gold">
                {a.title}
              </h3>
              <p className="line-clamp-3 text-sm text-muted">{a.summary}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
