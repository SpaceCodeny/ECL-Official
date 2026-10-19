"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface TransferConflict {
  currentTeam: { id: string; name: string; tag: string | null };
  message: string;
}

interface Props {
  open: boolean;
  conflict: TransferConflict | null;
  playerName: string;
  targetTeamName: string | null; // null = bench
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function TransferConfirmModal({
  open,
  conflict,
  playerName,
  targetTeamName,
  onConfirm,
  onCancel,
  isPending,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Confirmar movimentação"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-paper">
              {playerName} está atualmente no time{" "}
              <span className="text-gold">
                {conflict?.currentTeam.name}
                {conflict?.currentTeam.tag ? ` (${conflict.currentTeam.tag})` : ""}
              </span>
            </p>
            <p className="text-muted">
              {targetTeamName
                ? `Ao confirmar, ele será transferido para "${targetTeamName}".`
                : "Ao confirmar, ele será removido do time e irá para o banco."}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted">
          Esta ação ficará registrada no histórico do jogador com data e hora.
          Deseja continuar?
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Processando…" : "Confirmar transferência"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
