import { Badge, type BadgeProps } from "@/components/ui/badge";
import { matchStatusLabel } from "@/lib/labels";
import type { MatchStatus } from "@/types/match";

const variantByStatus: Record<MatchStatus, BadgeProps["variant"]> = {
  SCHEDULED: "neutral",
  READY: "warning",
  LIVE: "live",
  AWAITING_RESULT: "warning",
  COMPLETED: "success",
  DISPUTED: "warning",
  CANCELLED: "neutral",
};

export function MatchStatusBadge({ status, live = false }: { status: MatchStatus; live?: boolean }) {
  const isLive = live || status === "LIVE";
  return (
    <Badge variant={variantByStatus[status]} className={isLive ? "animate-pulse-live" : undefined}>
      {isLive ? (
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" aria-hidden />
      ) : null}
      {matchStatusLabel[status]}
    </Badge>
  );
}
