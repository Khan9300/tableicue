'use client'

import React, { useState } from 'react'
import type { PlayerSummary, FeeEntry } from '@/lib/fees/types'
import { togglePaid, voidEntry } from '@/lib/fees/api'
import { formatCurrency, formatDate } from '@/lib/fees/utils'

const DISPLAY = 'font-[family-name:var(--font-display)]'

interface PlayerDetailProps {
  player: PlayerSummary
  onClose: () => void
  isCaptain: boolean
  pin?: string
  onUpdate: () => void
  teamId?: string
}

export default function PlayerDetail({ player, onClose, isCaptain, pin, onUpdate, teamId }: PlayerDetailProps) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  const matchesPlayed = player.wins + player.losses
  const winRate = matchesPlayed > 0 ? Math.round((player.wins / matchesPlayed) * 100) : 0
  const isOwed = player.balance > 0

  // Filter to non-voided entries, sorted by date (newest first)
  const activeEntries = (player.entries ?? [])
    .filter(e => !e.is_voided)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const unpaidEntries = activeEntries.filter(e => !e.is_paid)

  const handleTogglePaid = async (entryId: string, currentPaid: boolean) => {
    if (!pin || !teamId) return
    setLoadingIds(prev => new Set(prev).add(entryId))
    try {
      await togglePaid(entryId, !currentPaid, teamId, pin)
      onUpdate()
    } catch (err) {
      console.error('Error toggling paid:', err)
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(entryId); return s })
    }
  }

  const handleVoid = async (entryId: string) => {
    if (!pin || !teamId) return
    if (!window.confirm('Void this fee? This cannot be undone.')) return
    setLoadingIds(prev => new Set(prev).add(entryId))
    try {
      await voidEntry(entryId, 'Voided by captain', teamId, pin)
      onUpdate()
    } catch (err) {
      console.error('Error voiding:', err)
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(entryId); return s })
    }
  }

  const handleMarkAllPaid = async () => {
    if (!pin || !teamId || unpaidEntries.length === 0) return
    if (!window.confirm(`Mark ${unpaidEntries.length} fee${unpaidEntries.length > 1 ? 's' : ''} as paid?`)) return
    const ids = unpaidEntries.map(e => e.id)
    setLoadingIds(prev => { const s = new Set(prev); ids.forEach(id => s.add(id)); return s })
    try {
      await Promise.all(ids.map(id => togglePaid(id, true, teamId!, pin!)))
      onUpdate()
    } catch (err) {
      console.error('Error marking all paid:', err)
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); ids.forEach(id => s.delete(id)); return s })
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-[#0A1516] border-l border-[#17393A] shadow-2xl flex flex-col">
      {/* ─── Header ─── */}
      <div className="p-6 border-b border-[#17393A] relative shrink-0">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-[#6E9696] hover:text-[#FCFCFC] transition-colors text-xl"
        >
          ✕
        </button>
        <div className="flex items-center gap-3 mb-2">
          <h2 className={`${DISPLAY} text-2xl font-bold text-[#FCFCFC]`}>
            {player.player_name}
          </h2>
          {player.skill_level != null && (
            <span className="inline-flex items-center justify-center bg-[#00D8D8]/20 text-[#00D8D8] font-bold rounded-full w-8 h-8 text-sm">
              {player.skill_level}
            </span>
          )}
        </div>
        <div className={`text-2xl font-bold ${isOwed ? 'text-red-400' : 'text-emerald-400'}`}>
          {formatCurrency(player.balance)}
          <span className="text-sm font-normal text-[#6E9696] ml-2">
            {isOwed ? 'owed' : 'clear'}
          </span>
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-4 gap-4 p-5 bg-[#04090A] border-b border-[#17393A] shrink-0">
        {[
          { label: 'Played', value: matchesPlayed, color: 'text-[#FCFCFC]' },
          { label: 'Wins', value: player.wins, color: 'text-emerald-400' },
          { label: 'Losses', value: player.losses, color: 'text-red-400' },
          { label: 'Win %', value: `${winRate}%`, color: 'text-[#FCC048]' },
        ].map(stat => (
          <div key={stat.label} className="text-center">
            <div className="text-xs text-[#6E9696] mb-1">{stat.label}</div>
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ─── Mark All Paid ─── */}
      {isCaptain && unpaidEntries.length > 0 && (
        <div className="p-4 border-b border-[#17393A] shrink-0">
          <button
            onClick={handleMarkAllPaid}
            className="w-full rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 p-3 font-semibold hover:bg-emerald-500/30 transition-all text-sm"
          >
            Mark All Paid ({unpaidEntries.length} fee{unpaidEntries.length > 1 ? 's' : ''} · {formatCurrency(player.balance)})
          </button>
        </div>
      )}

      {/* ─── Fee History ─── */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className={`${DISPLAY} text-lg text-[#FCFCFC] mb-4`}>Fee History</h3>

        {activeEntries.length === 0 ? (
          <p className="text-[#6E9696] text-center italic mt-10">No match history yet.</p>
        ) : (
          <div className="space-y-3">
            {activeEntries.map((entry: FeeEntry) => {
              const isLoading = loadingIds.has(entry.id)
              return (
                <div key={entry.id} className="rounded-xl border border-[#17393A] bg-[#04090A] p-4">
                  {/* Entry info */}
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className="text-[#FCFCFC] font-medium text-sm">
                        {formatDate(entry.created_at)}
                      </div>
                      <div className="text-xs text-[#6E9696]">
                        {entry.round_number ? `Round ${entry.round_number}` : 'Manual'}
                        {entry.opponent_name && ` · vs ${entry.opponent_name}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#FCFCFC] text-sm">{formatCurrency(entry.amount)}</div>
                      <div className={`text-xs font-semibold ${entry.is_paid ? 'text-emerald-400' : 'text-red-400'}`}>
                        {entry.is_paid ? '✓ Paid' : 'Unpaid'}
                      </div>
                    </div>
                  </div>

                  {/* Result badge */}
                  {entry.result && (
                    <div className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded ${
                      entry.result === 'W' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {entry.result === 'W' ? 'Win' : 'Loss'}
                    </div>
                  )}

                  {/* Captain actions */}
                  {isCaptain && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-[#17393A]/50">
                      <button
                        onClick={() => handleTogglePaid(entry.id, entry.is_paid)}
                        disabled={isLoading}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                          entry.is_paid
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isLoading ? '…' : entry.is_paid ? 'Mark Unpaid' : 'Mark Paid'}
                      </button>
                      <button
                        onClick={() => handleVoid(entry.id)}
                        disabled={isLoading}
                        className="px-3 rounded-lg py-1.5 text-xs font-semibold bg-[#17393A]/30 text-[#6E9696] hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        Void
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
