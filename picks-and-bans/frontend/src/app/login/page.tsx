"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Eye, EyeOff, ArrowRight, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003').replace(/\/$/, '');
      
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao fazer login');
      }

      const data = await response.json();
      
      // Salvar token no localStorage
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));

      // Redirecionar para admin
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink">
      {/* Background Premium Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-gold/5 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[800px] w-[800px] rounded-full bg-blue-500/5 blur-[120px]" />
        
        {/* Animated Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(214,181,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(214,181,94,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000,transparent)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo Section */}
        <div className="mb-10 text-center">
          <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 animate-pulse rounded-full bg-gold/20 blur-xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-gold/20 bg-gradient-to-br from-navy via-surface to-navy shadow-2xl shadow-gold/10">
              <Image
                src="https://ecl-official.vercel.app/images/logo.png"
                alt="ECL Logo"
                width={64}
                height={64}
                className="relative z-10"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-paper via-gold to-paper bg-clip-text text-transparent">
                Admin Portal
              </span>
            </h1>
            <p className="text-sm font-medium uppercase tracking-wider text-muted">
              Picks & Bans System
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="group relative">
          {/* Glow Effect on Hover */}
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-gold via-blue-500 to-gold opacity-0 blur transition duration-500 group-hover:opacity-20" />
          
          <div className="relative overflow-hidden rounded-2xl border border-gold/10 bg-gradient-to-b from-surface/90 via-surface/95 to-navy/90 p-8 shadow-2xl backdrop-blur-xl">
            {/* Shine Effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
            
            <form onSubmit={handleLogin} className="relative space-y-6">
              {/* Username Input */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold uppercase tracking-wider text-gold">
                  Usuário
                </label>
                <div className="group/input relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                    <User className="h-5 w-5 text-muted transition-colors group-focus-within/input:text-gold" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Digite seu usuário"
                    className="w-full rounded-xl border border-border bg-ink/50 py-3.5 pl-12 pr-4 font-medium text-paper placeholder:text-muted/40 transition-all focus:border-gold focus:bg-ink focus:outline-none focus:ring-2 focus:ring-gold/20"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold uppercase tracking-wider text-gold">
                  Senha
                </label>
                <div className="group/input relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                    <Lock className="h-5 w-5 text-muted transition-colors group-focus-within/input:text-gold" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full rounded-xl border border-border bg-ink/50 py-3.5 pl-12 pr-12 font-medium text-paper placeholder:text-muted/40 transition-all focus:border-gold focus:bg-ink focus:outline-none focus:ring-2 focus:ring-gold/20"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted transition-colors hover:text-paper"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/20">
                      <Shield className="h-4 w-4 text-red-400" />
                    </div>
                    <p className="text-sm font-medium text-red-400">{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="group/btn relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-gold via-yellow-500 to-gold p-[2px] transition-all hover:shadow-lg hover:shadow-gold/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
              >
                <div className="relative flex items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-gold via-yellow-500 to-gold px-6 py-3.5 font-display text-base font-bold uppercase tracking-wider text-ink transition-all">
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-5 w-5" />
                      <span>Acessar Sistema</span>
                      <ArrowRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
                    </>
                  )}
                </div>
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link 
            href="https://ecl-official.vercel.app"
            target="_blank"
            className="group inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-gold"
          >
            <span className="font-medium">Elite Champions League</span>
            <span className="text-gold">©</span>
            <span className="font-bold">{new Date().getFullYear()}</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
