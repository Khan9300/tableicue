'use client'

import React from 'react'
import type { FeeSession } from '@/lib/fees/types'

interface SessionSwitcherProps {
  sessions: FeeSession[]
  activeSessionId: string
  onSwitch: (sessionId: string) => void
}

export default function SessionSwitcher({ sessions, activeSessionId, onSwitch }: SessionSwitcherProps) {
  if (!sessions || sessions.length === 0) return null

  return (
    <div className="relative inline-block w-full sm:w-auto">
      <select
        value={activeSessionId}
        onChange={e => onSwitch(e.target.value)}
        className="appearance-none w-full sm:w-56 bg-[#0A1516] border border-[#17393A] text-[#FCFCFC] font-medium rounded-xl px-4 py-2.5 pr-10 outline-none focus:border-[#00D8D8] transition-colors cursor-pointer text-sm"
      >
        {sessions.map(session => (
          <option key={session.id} value={session.id}>
            {session.session_name}{session.is_active ? '' : ' (Archived)'}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#6E9696]">
        ▼
      </div>
      {/* Green dot for active session */}
      {sessions.find(s => s.id === activeSessionId && s.is_active) && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
      )}
    </div>
  )
}
