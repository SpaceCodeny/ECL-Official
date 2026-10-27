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
      
      // Salvar token e role no localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.user.role); // SUPER_ADMIN ou ADMIN
      localStorage.setItem('username', data.user.username);

      // Redirecionar baseado no role
      if (data.user.role === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else {
        router.push('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4 py-6 sm:p-8">
      {/* Background Image - Desktop */}
      <div className="absolute inset-0 z-0 hidden md:block">
        <Image
          src="https://ecl-official.vercel.app/images/desktop.png"
          alt="Elite Champions League Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Gradiente escuro para melhor legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />
      </div>

      {/* Background Image - Mobile */}
      <div className="absolute inset-0 z-0 md:hidden">
        <Image
          src="https://ecl-official.vercel.app/images/mobile.png"
          alt="Elite Champions League Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Gradiente escuro para melhor legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/85" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo Section */}
        <div className="mb-6 text-center sm:mb-10">
          <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center sm:mb-8 sm:h-24 sm:w-24">
            <div className="absolute inset-0 animate-pulse rounded-full bg-gold/20 blur-xl" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/20 bg-gradient-to-br from-navy via-surface to-navy shadow-2xl shadow-gold/10 backdrop-blur-sm sm:h-20 sm:w-20">
              <Image
                src="https://ecl-official.vercel.app/images/logo.png"
                alt="ECL Logo"
                width={64}
                height={64}
                className="relative z-10 h-10 w-10 sm:h-16 sm:w-16"
              />
            </div>
          </div>
          
          <div className="space-y-2 sm:space-y-3">
            <h1 className="font-display text-3xl font-bold uppercase leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              <span className="block text-white">Admin</span>
              <span className="block text-gold" style={{ textShadow: "0 0 40px rgba(214,177,94,0.5)" }}>
                Portal
              </span>
            </h1>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold/80 sm:text-sm">
              Picks & Bans System
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="group relative">
          {/* Glow Effect on Hover */}
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-gold via-yellow-500 to-gold opacity-0 blur transition duration-500 group-hover:opacity-20" />
          
          <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-black/40 p-5 shadow-2xl backdrop-blur-xl sm:p-8">
            {/* Shine Effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
            
            <form onSubmit={handleLogin} className="relative space-y-4 sm:space-y-6">
              {/* Username Input */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block font-display text-xs font-bold uppercase tracking-wider text-gold sm:text-sm">
                  Usuário
                </label>
                <div className="group/input relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4">
                    <User className="h-4 w-4 text-gold/60 transition-colors group-focus-within/input:text-gold sm:h-5 sm:w-5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Digite seu usuário"
                    className="w-full rounded-xl border border-gold/20 bg-black/60 py-2.5 pl-10 pr-3 text-sm font-medium text-white placeholder:text-white/40 backdrop-blur-sm transition-all focus:border-gold focus:bg-black/80 focus:outline-none focus:ring-2 focus:ring-gold/30 sm:py-3.5 sm:pl-12 sm:pr-4 sm:text-base"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block font-display text-xs font-bold uppercase tracking-wider text-gold sm:text-sm">
                  Senha
                </label>
                <div className="group/input relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4">
                    <Lock className="h-4 w-4 text-gold/60 transition-colors group-focus-within/input:text-gold sm:h-5 sm:w-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full rounded-xl border border-gold/20 bg-black/60 py-2.5 pl-10 pr-10 text-sm font-medium text-white placeholder:text-white/40 backdrop-blur-sm transition-all focus:border-gold focus:bg-black/80 focus:outline-none focus:ring-2 focus:ring-gold/30 sm:py-3.5 sm:pl-12 sm:pr-12 sm:text-base"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gold/60 transition-colors hover:text-gold sm:pr-4"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-xl border border-red-500/30 bg-red-500/10 p-4 backdrop-blur-sm">
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
                <div className="relative flex items-center justify-center gap-1.5 rounded-[10px] bg-gradient-to-r from-gold via-yellow-500 to-gold px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-black transition-all sm:gap-2 sm:px-6 sm:py-3.5 sm:text-base">
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black sm:h-5 sm:w-5" />
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>Acessar Sistema</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1 sm:h-5 sm:w-5" />
                    </>
                  )}
                </div>
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center sm:mt-8">
          <Link 
            href="https://ecl-official.vercel.app"
            target="_blank"
            className="group inline-flex items-center gap-1.5 text-xs text-white/70 transition-colors hover:text-gold sm:gap-2 sm:text-sm"
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
