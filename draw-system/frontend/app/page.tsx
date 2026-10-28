import Link from 'next/link';
import { Shield, Zap, Eye, Lock, Award, Clock } from 'lucide-react';
import { ECLLogo } from '@/components/ECLLogo';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="header-ecl">
        <div className="container-ecl">
          <div className="flex h-16 items-center justify-between">
            <ECLLogo />
            <div className="flex items-center gap-3">
              <Link href="/admin" className="btn-secondary text-sm">
                Admin Access
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative overflow-hidden border-b border-surface-border py-24 lg:py-32">
        {/* Background effects */}
        <div className="lighting-top" />
        <div className="scan-lines" />
        
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric/5 blur-3xl" />

        <div className="container-ecl relative">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-4 py-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-electric" />
              <span className="font-display text-xs font-bold uppercase tracking-widest text-electric">
                Official ECL Draw System
              </span>
            </div>

            {/* Title */}
            <h1 className="mb-6 font-display text-6xl font-bold uppercase leading-none lg:text-7xl">
              <span className="text-gradient-electric">Official Draws</span>
              <br />
              <span className="text-text-primary">For Champions</span>
            </h1>

            {/* Subtitle */}
            <p className="mb-10 text-lg leading-relaxed text-text-secondary lg:text-xl">
              Professional draw system with cinematic animations inspired by CS2,
              <br className="hidden sm:block" />
              cryptographic security and total transparency.
            </p>

            {/* CTAs */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/admin" className="btn-primary w-full sm:w-auto">
                <Shield className="h-5 w-5" />
                Access Admin Panel
              </Link>
              <Link href="/admin/draws" className="btn-secondary w-full sm:w-auto">
                <Zap className="h-5 w-5" />
                Execute Draw
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background-primary to-transparent" />
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container-ecl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 font-display text-4xl font-bold uppercase text-text-primary">
              Premium Features
            </h2>
            <p className="text-lg text-text-secondary">
              Professional technology for official draws
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="surface-card-hover">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-electric/20 text-electric">
                <Lock className="h-7 w-7" />
              </div>
              <h3 className="mb-3 font-display text-xl font-bold uppercase text-text-primary">
                Cryptographic Security
              </h3>
              <p className="leading-relaxed text-text-secondary">
                CSPRNG algorithms with Fisher-Yates shuffle and commit-reveal protocol for total auditability.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="surface-card-hover">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-electric/20 text-electric">
                <Zap className="h-7 w-7" />
              </div>
              <h3 className="mb-3 font-display text-xl font-bold uppercase text-text-primary">
                Cinematic Animations
              </h3>
              <p className="leading-relaxed text-text-secondary">
                CS2-inspired case opening animation with particles, glow effects and immersive sounds.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="surface-card-hover">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-electric/20 text-electric">
                <Eye className="h-7 w-7" />
              </div>
              <h3 className="mb-3 font-display text-xl font-bold uppercase text-text-primary">
                Live Broadcasting
              </h3>
              <p className="leading-relaxed text-text-secondary">
                Interface optimized for OBS with real-time updates and Full HD 1920x1080 layout.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="surface-card-hover">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-electric/20 text-electric">
                <Award className="h-7 w-7" />
              </div>
              <h3 className="mb-3 font-display text-xl font-bold uppercase text-text-primary">
                4 Draw Methods
              </h3>
              <p className="leading-relaxed text-text-secondary">
                Random, Balanced, Pot-Based or Snake Draft — choose the best for your championship.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="surface-card-hover">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-electric/20 text-electric">
                <Zap className="h-7 w-7" />
              </div>
              <h3 className="mb-3 font-display text-xl font-bold uppercase text-text-primary">
                Optimized Performance
              </h3>
              <p className="leading-relaxed text-text-secondary">
                Built with Next.js 14 and Framer Motion for 60 FPS animations without lag.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="surface-card-hover">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-electric/20 text-electric">
                <Clock className="h-7 w-7" />
              </div>
              <h3 className="mb-3 font-display text-xl font-bold uppercase text-text-primary">
                Complete History
              </h3>
              <p className="leading-relaxed text-text-secondary">
                All draws are recorded with timestamps, hashes and results for later consultation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-surface-border bg-background-secondary py-20">
        <div className="container-ecl">
          <div className="grid gap-12 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-3 font-display text-6xl font-bold text-gradient-electric">
                100%
              </div>
              <div className="text-lg font-medium text-text-secondary">Transparent & Auditable</div>
            </div>
            <div className="text-center">
              <div className="mb-3 font-display text-6xl font-bold text-gradient-electric">
                5s
              </div>
              <div className="text-lg font-medium text-text-secondary">Animation Duration</div>
            </div>
            <div className="text-center">
              <div className="mb-3 font-display text-6xl font-bold text-gradient-electric">
                60 FPS
              </div>
              <div className="text-lg font-medium text-text-secondary">Guaranteed Performance</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="border-t border-surface-border py-20">
        <div className="container-ecl">
          <div className="surface-card border-electric/30 bg-electric/5 text-center">
            <h2 className="mb-4 font-display text-5xl font-bold uppercase text-text-primary">
              Ready to Draw?
            </h2>
            <p className="mb-8 text-lg text-text-secondary">
              Start now and create professional draws for your tournaments
            </p>
            <Link href="/admin/draws" className="btn-primary inline-flex px-12 py-5 text-lg">
              <Zap className="h-6 w-6" />
              START DRAW
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border bg-background-secondary py-8">
        <div className="container-ecl">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <ECLLogo size="sm" />
            <p className="text-sm text-text-secondary">
              © 2024 Elite Champions League. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
