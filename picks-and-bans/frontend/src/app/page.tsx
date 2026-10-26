"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Verificar se já está autenticado
    const token = localStorage.getItem('admin_token');
    
    if (token) {
      // Se autenticado, ir para admin
      router.push('/admin');
    } else {
      // Se não autenticado, ir para login
      router.push('/login');
    }
  }, [router]);

  // Loading enquanto redireciona
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gold border-t-transparent" />
        <p className="text-muted">Carregando...</p>
      </div>
    </div>
  );
}
