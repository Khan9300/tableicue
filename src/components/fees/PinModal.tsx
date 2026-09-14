'use client'

import React, { useState } from 'react'
import { verifyPin } from '@/lib/fees/api'

interface PinModalProps {
  isOpen: boolean
  onClose: () => void
  onVerified: (pin: string, teamId: string) => void
  teamCode: string
}

export default function PinModal({ isOpen, onClose, onVerified, teamCode }: PinModalProps) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await verifyPin(teamCode, pin)
      if (response?.valid && response.team_id) {
        onVerified(pin, response.team_id)
        setPin('')
        onClose()
      } else {
        setError('Invalid PIN')
      }
    } catch (err: any) {
      setError(err.message || 'Invalid PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[#17393A] bg-[#0A1516] p-6 shadow-xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6E9696] hover:text-[#FCFCFC] transition-colors"
        >
          ✕
        </button>
        
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#FCFCFC] mb-6 text-center">
          Captain Login
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-6 digit PIN"
              className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-4 text-center text-xl tracking-widest text-[#FCFCFC] placeholder-[#6E9696] outline-none focus:border-[#00D8D8] focus:ring-1 focus:ring-[#00D8D8] transition-all"
              autoFocus
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full rounded-xl bg-[#00D8D8] p-4 font-semibold text-[#04090A] hover:bg-[#00D8D8]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
