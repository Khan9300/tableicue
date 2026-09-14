'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function FeesLandingPage() {
  const [teamCode, setTeamCode] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (teamCode.trim()) {
      router.push(`/fees/${teamCode.trim().toUpperCase()}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#17393A] bg-[#0A1516] p-8 shadow-2xl">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-[#FCFCFC] mb-2 text-center">
            APA Fee Tracker
          </h1>
          <p className="text-[#6E9696] text-center mb-8">
            Manage your team's roster, matches, and fees.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="text"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                placeholder="ENTER TEAM CODE"
                maxLength={8}
                className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-4 text-center text-2xl font-bold tracking-widest text-[#FCFCFC] placeholder-[#17393A] outline-none focus:border-[#00D8D8] focus:ring-1 focus:ring-[#00D8D8] transition-all"
                autoFocus
              />
            </div>
            
            <button
              type="submit"
              disabled={!teamCode.trim()}
              className="w-full rounded-xl bg-[#00D8D8] p-4 font-semibold text-[#04090A] hover:bg-[#00D8D8]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Go to Dashboard
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <Link 
            href="/fees/setup"
            className="text-[#6E9696] hover:text-[#00D8D8] transition-colors"
          >
            Set up a new team →
          </Link>
        </div>
      </div>
    </div>
  )
}
