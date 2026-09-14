'use client';

import Link from 'next/link';
import { Trophy, Target, Zap } from 'lucide-react';

const TEAMS = [
  {
    key: 'predators-8',
    name: 'The Predators 8',
    format: '8-Ball' as const,
    night: 'Monday',
    venue: 'Sunset Terrace',
    icon: Trophy,
    accent: 'from-amber-500/20 to-amber-600/5',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-400',
  },
  {
    key: 'table-i-cue',
    name: 'Table I-Cue',
    format: '8-Ball' as const,
    night: 'Tuesday',
    venue: 'Arena Sports Grill',
    icon: Target,
    accent: 'from-blue-500/20 to-blue-600/5',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-400',
  },
  {
    key: 'ctrl-alt-defeat',
    name: 'Ctrl Alt Defeat',
    format: '9-Ball' as const,
    night: 'Wednesday',
    venue: 'Lucky Cue',
    icon: Zap,
    accent: 'from-emerald-500/20 to-emerald-600/5',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-400',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl font-bold text-rack-gold tracking-tight">
          RackIQ
        </h1>
        <p className="text-rack-white/50 text-sm mt-1 font-body">
          Outsmart the rack
        </p>
      </div>

      {/* Team cards */}
      <div className="w-full max-w-md space-y-3">
        {TEAMS.map((team) => {
          const Icon = team.icon;
          return (
            <Link
              key={team.key}
              href={`/${team.key}`}
              className={`block w-full rounded-xl border ${team.border} bg-gradient-to-r ${team.accent} backdrop-blur p-4 transition-all active:scale-[0.98] hover:border-opacity-60`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <Icon className="w-8 h-8 text-rack-gold/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-semibold text-rack-white truncate">
                      {team.name}
                    </h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${team.badge}`}>
                      {team.format}
                    </span>
                  </div>
                  <p className="text-rack-white/40 text-sm">
                    {team.night} · {team.venue}
                  </p>
                </div>
                <div className="text-rack-white/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Tools */}
      <div className="w-full max-w-md mt-4">
        <Link 
          href="/fees" 
          className="flex items-center justify-between w-full rounded-xl border border-rack-gold/30 bg-gradient-to-r from-rack-gold/10 to-transparent p-4 transition-all hover:border-rack-gold/60 active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <div className="font-display text-base font-bold text-rack-white flex items-center gap-2">
                Team Fee Tracker
                <span className="text-[10px] bg-rack-gold/20 text-rack-gold px-2 py-0.5 rounded-full font-bold uppercase">
                  Cash · Venmo · Zelle
                </span>
              </div>
              <p className="text-rack-white/40 text-xs">
                Roll call, $10 match fees, payment logs & player balances
              </p>
            </div>
          </div>
          <div className="text-rack-gold/40">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Footer */}
      <p className="text-rack-white/20 text-xs mt-8">
        APA South Coast · Fall 2026
      </p>
    </div>
  );
}
