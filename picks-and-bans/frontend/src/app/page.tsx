"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    
    if (token && userRole) {
      if (userRole === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else {
        router.push('/admin');
      }
    } else {
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
