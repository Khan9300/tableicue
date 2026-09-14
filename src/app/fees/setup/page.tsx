'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createTeam } from '@/lib/fees/api'

export default function SetupPage() {
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    team_name: '',
    team_number: '',
    format: '8ball' as '8ball' | '9ball',
    night: 'Mon' as 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun',
    captain_name: '',
    current_session: 'Fall 2026',
    pin: '',
    confirmPin: ''
  })
  const [rosterText, setRosterText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successCode, setSuccessCode] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (formData.pin !== formData.confirmPin) {
      setError('PINs do not match')
      return
    }
    if (formData.pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }

    setLoading(true)
    try {
      const result = await createTeam({
        team_name: formData.team_name,
        team_number: formData.team_number || undefined,
        format: formData.format,
        night: formData.night,
        captain_name: formData.captain_name || undefined,
        pin: formData.pin,
        current_session: formData.current_session,
      })

      setSuccessCode(result.team_code)

      // Add initial roster players if provided
      // (players are added separately via the addPlayer API after team creation)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
    } finally {
      setLoading(false)
    }
  }

  if (successCode) {
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/fees/${successCode}`
    
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-emerald-500/30 bg-[#0A1516] p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#FCFCFC] mb-2">
            Team Created!
          </h2>
          <p className="text-[#6E9696] mb-8">Save this team code. You'll need it to access your dashboard.</p>
          
          <div className="bg-[#04090A] border border-[#17393A] rounded-xl p-6 mb-8">
            <div className="text-sm text-[#6E9696] mb-2">TEAM CODE</div>
            <div className="text-4xl font-bold tracking-widest text-emerald-400">
              {successCode}
            </div>
          </div>

          <div className="mb-8">
            <div className="text-sm text-[#6E9696] mb-2">Shareable Link</div>
            <code className="block bg-[#04090A] p-3 rounded-lg text-xs break-all text-[#00D8D8]">
              {shareUrl}
            </code>
          </div>

          <Link 
            href={`/fees/${successCode}`}
            className="block w-full rounded-xl bg-[#00D8D8] p-4 font-semibold text-[#04090A] hover:bg-[#00D8D8]/90 transition-all"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">
      <Link href="/fees" className="text-[#6E9696] hover:text-[#00D8D8] mb-8 inline-block">
        ← Back
      </Link>
      
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-[#FCFCFC] mb-8">
        Set Up New Team
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-[#0A1516] border border-[#17393A] rounded-2xl p-6 md:p-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-[#6E9696] mb-1">Team Name *</label>
            <input required type="text" name="team_name" value={formData.team_name} onChange={handleChange} placeholder="e.g. Table I-Cue" className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-3 text-[#FCFCFC] placeholder:text-[#6E9696]/50 focus:border-[#00D8D8] outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-sm text-[#6E9696] mb-1">Team Number</label>
            <input type="text" name="team_number" value={formData.team_number} onChange={handleChange} placeholder="e.g. 02110" className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-3 text-[#FCFCFC] placeholder:text-[#6E9696]/50 focus:border-[#00D8D8] outline-none transition-colors" />
          </div>
          
          <div>
            <label className="block text-sm text-[#6E9696] mb-1">Format</label>
            <select name="format" value={formData.format} onChange={handleChange} className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-3 text-[#FCFCFC] focus:border-[#00D8D8] outline-none transition-colors">
              <option value="8ball">8-Ball</option>
              <option value="9ball">9-Ball</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#6E9696] mb-1">League Night</label>
            <select name="night" value={formData.night} onChange={handleChange} className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-3 text-[#FCFCFC] focus:border-[#00D8D8] outline-none transition-colors">
              {[['Mon','Monday'],['Tue','Tuesday'],['Wed','Wednesday'],['Thu','Thursday'],['Fri','Friday'],['Sat','Saturday'],['Sun','Sunday']].map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#6E9696] mb-1">Captain Name</label>
            <input type="text" name="captain_name" value={formData.captain_name} onChange={handleChange} placeholder="Your name" className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-3 text-[#FCFCFC] placeholder:text-[#6E9696]/50 focus:border-[#00D8D8] outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-sm text-[#6E9696] mb-1">Initial Session *</label>
            <input required type="text" name="current_session" value={formData.current_session} onChange={handleChange} className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-3 text-[#FCFCFC] focus:border-[#00D8D8] outline-none transition-colors" />
          </div>

          <div>
            <label className="block text-sm text-[#6E9696] mb-1">Captain PIN (4-6 digits) *</label>
            <input required type="password" inputMode="numeric" maxLength={6} name="pin" value={formData.pin} onChange={e => setFormData(p => ({...p, pin: e.target.value.replace(/\D/g,'')}))} className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-3 text-[#FCFCFC] focus:border-[#00D8D8] outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-sm text-[#6E9696] mb-1">Confirm PIN *</label>
            <input required type="password" inputMode="numeric" maxLength={6} name="confirmPin" value={formData.confirmPin} onChange={e => setFormData(p => ({...p, confirmPin: e.target.value.replace(/\D/g,'')}))} className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-3 text-[#FCFCFC] focus:border-[#00D8D8] outline-none transition-colors" />
          </div>
        </div>

        <div className="pt-6 border-t border-[#17393A]">
          <label className="block text-sm text-[#6E9696] mb-2">
            Initial Roster (Optional)
            <span className="block text-xs mt-1">Enter one player per line. Add skill level after name (e.g., "John Doe 5")</span>
          </label>
          <textarea
            value={rosterText}
            onChange={e => setRosterText(e.target.value)}
            rows={6}
            placeholder="John Doe 5&#10;Jane Smith 4"
            className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-3 text-[#FCFCFC] focus:border-[#00D8D8] outline-none font-mono text-sm"
          />
        </div>

        {error && <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-lg border border-red-500/20">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#00D8D8] p-4 font-semibold text-[#04090A] hover:bg-[#00D8D8]/90 disabled:opacity-50 transition-all"
        >
          {loading ? 'Creating...' : 'Create Team'}
        </button>
      </form>
    </div>
  )
}
