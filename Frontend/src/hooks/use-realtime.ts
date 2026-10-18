"use client";

import { useEffect, useRef, useState } from "react";
import type { io as ioType } from "socket.io-client";
import { useAuthStore } from "@/stores/auth.store";

/**
 * Hook de conexão WebSocket para atualizações em tempo real.
 * Usa Socket.IO conectado ao backend. Apenas autentica se o usuário estiver logado.
 *
 * Permissões de canal são verificadas no servidor (RealtimeGateway).
 */
export function useRealtime() {
  const { user, status } = useAuthStore();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<ReturnType<typeof ioType> | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;

    let mounted = true;
    // Import dinâmico para evitar carregar socket.io no SSR.
    import("socket.io-client").then(({ io }) => {
      if (!mounted) return;

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001";
      const token = typeof window !== "undefined" ? sessionStorage.getItem("ecl_at") : null;

      const socket = io(`${wsUrl}/realtime`, {
        auth: token ? { token } : undefined,
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
      });

      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));
      socketRef.current = socket;
    });

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [status, user]);

  return { connected, socket: socketRef.current };
}
