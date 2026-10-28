'use client';

import Link from 'next/link';
import { Trophy, Users, Shuffle, TrendingUp, Calendar, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    { label: 'Active Tournaments', value: '3', icon: Trophy, color: 'text-electric' },
    { label: 'Registered Teams', value: '24', icon: Users, color: 'text-electric-light' },
    { label: 'Completed Draws', value: '12', icon: CheckCircle, color: 'text-gold' },
    { label: 'Success Rate', value: '100%', icon: TrendingUp, color: 'text-gold-light' },
  ];

  const recentActivity = [
    { action: 'Draw completed', tournament: 'ECL Season 1', time: '2 hours ago', type: 'success' },
    { action: 'Team registered', tournament: 'Immortals Gaming', time: '5 hours ago', type: 'info' },
    { action: 'Tournament created', tournament: 'ECL Invitational', time: '1 day ago', type: 'info' },
  ];

  return (
    <div className="container-ecl">
      {/* Header */}
      <div className="mb-12">
        <h1 className="mb-2 font-display text-display-md uppercase text-text-primary">
          Admin Dashboard
        </h1>
        <p className="text-lg text-text-secondary">
          Manage tournaments, teams and official draws
        </p>
      </div>

      {/* Stats grid */}
      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="surface-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium uppercase tracking-wide text-text-secondary">
                    {stat.label}
                  </p>
                  <p className="font-display text-4xl font-bold text-text-primary">{stat.value}</p>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg bg-surface-border ${stat.color}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="mb-12">
        <h2 className="mb-6 font-display text-2xl font-bold uppercase text-text-primary">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Link href="/admin/tournaments" className="surface-card-hover group">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-electric/20 text-electric transition-colors group-hover:bg-electric group-hover:text-background-primary">
              <Trophy className="h-7 w-7" />
            </div>
            <h3 className="mb-2 font-display text-xl font-bold uppercase text-text-primary">
              Manage Tournaments
            </h3>
            <p className="text-sm leading-relaxed text-text-secondary">
              Create and configure tournaments, add teams and define groups
            </p>
          </Link>

          <Link href="/admin/teams" className="surface-card-hover group">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-electric/20 text-electric transition-colors group-hover:bg-electric group-hover:text-background-primary">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="mb-2 font-display text-xl font-bold uppercase text-text-primary">
              Manage Teams
            </h3>
            <p className="text-sm leading-relaxed text-text-secondary">
              Register teams, set pots and configure information
            </p>
          </Link>

          <Link href="/admin/draws" className="surface-card-hover group">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-electric/20 text-electric transition-colors group-hover:bg-electric group-hover:text-background-primary">
              <Shuffle className="h-7 w-7" />
            </div>
            <h3 className="mb-2 font-display text-xl font-bold uppercase text-text-primary">
              Execute Draws
            </h3>
            <p className="text-sm leading-relaxed text-text-secondary">
              Configure and execute draws with cryptographic security
            </p>
          </Link>
        </div>
      </div>

      {/* Recent activity */}
      <div className="surface-card">
        <h2 className="mb-6 font-display text-2xl font-bold uppercase text-text-primary">
          Recent Activity
        </h2>
        <div className="space-y-4">
          {recentActivity.map((activity, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-surface-border pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-2 w-2 rounded-full ${
                    activity.type === 'success' ? 'bg-gold' : 'bg-electric'
                  }`}
                />
                <div>
                  <p className="font-medium text-text-primary">{activity.action}</p>
                  <p className="text-sm text-text-secondary">{activity.tournament}</p>
                </div>
              </div>
              <span className="text-sm text-text-secondary">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
