"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";

/**
 * Hidrata o store de autenticação ao montar a aplicação.
 * Verifica se há token no sessionStorage e tenta buscar o perfil.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <>{children}</>;
}
