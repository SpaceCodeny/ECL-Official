import { Badge, type BadgeProps } from "@/components/ui/badge";
import { tournamentStatusLabel } from "@/lib/labels";
import type { TournamentStatus } from "@/types/tournament";

const variantByStatus: Record<TournamentStatus, BadgeProps["variant"]> = {
  DRAFT: "neutral",
  PUBLISHED: "neutral",
  REGISTRATION_OPEN: "success",
  REGISTRATION_CLOSED: "warning",
  IN_PROGRESS: "live",
  COMPLETED: "neutral",
  CANCELLED: "neutral",
};

export function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  return <Badge variant={variantByStatus[status]}>{tournamentStatusLabel[status]}</Badge>;
}
