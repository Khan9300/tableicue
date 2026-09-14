'use client'

import React, { useState } from 'react'
import type { FeePlayer, FeeEntry } from '@/lib/fees/types'
import { createMatchNight, lockInPlayer, logResult } from '@/lib/fees/api'
import { ALL_TEAMS } from '@/lib/data/teams'

const DISPLAY = 'font-[family-name:var(--font-display)]'

interface MatchNightPanelProps {
  teamId: string
  sessionId: string
  players: FeePlayer[]
  pin: string
  onUpdate: () => void
}

type Step = 'create' | 'rollcall' | 'lockin'

interface RoundState {
  entryId?: string
  playerName: string | null
  playerSl: number | null
  result?: 'W' | 'L'
}

export default function MatchNightPanel({ teamId, sessionId, players, pin, onUpdate }: MatchNightPanelProps) {
  const [step, setStep] = useState<Step>('create')

  // Create Match Night state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [opponent, setOpponent] = useState('')
  const [week, setWeek] = useState('')
  const [matchNightId, setMatchNightId] = useState<string | null>(null)

  // Roll call state — all present by default
  const [presentNames, setPresentNames] = useState<Set<string>>(
    new Set(players.map(p => p.player_name))
  )

  // Lock-in state — 5 rounds
  const [rounds, setRounds] = useState<RoundState[]>(
    Array.from({ length: 5 }, () => ({ playerName: null, playerSl: null }))
  )
  const [loading, setLoading] = useState(false)

  /* ─── Create Match Night ─── */
  const handleCreateMatchNight = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin) return
    setLoading(true)
    try {
      const mn = await createMatchNight(
        {
          session_id: sessionId,
          team_id: teamId,
          match_date: date,
          week_number: week ? parseInt(week) : undefined,
          opponent_name: opponent || undefined,
        },
        pin
      )
      setMatchNightId(mn.id)
      setStep('rollcall')
      onUpdate()
    } catch (err) {
      console.error(err)
      alert('Failed to create match night')
    } finally {
      setLoading(false)
    }
  }

  /* ─── Roll Call ─── */
  const handleTogglePresent = (name: string) => {
    setPresentNames(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  /* ─── Lock In ─── */
  const handleLockIn = async (roundIndex: number, playerName: string) => {
    if (!matchNightId || !pin) return
    const player = players.find(p => p.player_name === playerName)
    setLoading(true)
    try {
      const entry: FeeEntry = await lockInPlayer(
        {
          match_night_id: matchNightId,
          team_id: teamId,
          player_name: playerName,
          round_number: roundIndex + 1,
          amount: 10,
          player_sl: player?.skill_level ?? undefined,
        },
        pin
      )
      const newRounds = [...rounds]
      newRounds[roundIndex] = {
        entryId: entry.id,
        playerName,
        playerSl: player?.skill_level ?? null,
      }
      setRounds(newRounds)
      onUpdate()
    } catch (err) {
      console.error(err)
      alert('Failed to lock in player')
    } finally {
      setLoading(false)
    }
  }

  /* ─── Log Result ─── */
  const handleResult = async (roundIndex: number, result: 'W' | 'L') => {
    const round = rounds[roundIndex]
    if (!round.entryId || !pin) return
    setLoading(true)
    try {
      await logResult(round.entryId, result, teamId, pin)
      const newRounds = [...rounds]
      newRounds[roundIndex] = { ...round, result }
      setRounds(newRounds)
      onUpdate()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  /* ─── Computed ─── */
  const slTotal = rounds.reduce((sum, r) => sum + (r.playerSl ?? 0), 0)
  const seniorCount = rounds.filter(r => (r.playerSl ?? 0) >= 6).length
  const totalFees = rounds.filter(r => r.playerName).length * 10

  /* ─── Render ─── */
  return (
    <div className="rounded-2xl border border-[#17393A] bg-[#0A1516] p-6">

      {/* ─── Step 1: Create Match Night ─── */}
      {step === 'create' && (
        <div>
          <h2 className={`${DISPLAY} text-2xl font-bold text-[#FCFCFC] mb-6`}>
            Start Match Night
          </h2>
          <form onSubmit={handleCreateMatchNight} className="space-y-4">
            <div>
              <label className="block text-sm text-[#6E9696] mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-3 text-[#FCFCFC] outline-none focus:border-[#00D8D8] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-[#6E9696] mb-1">Opponent</label>
              <input
                type="text"
                required
                value={opponent}
                onChange={e => setOpponent(e.target.value)}
                placeholder="Team name"
                className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-3 text-[#FCFCFC] placeholder:text-[#6E9696]/50 outline-none focus:border-[#00D8D8] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-[#6E9696] mb-1">Week Number (optional)</label>
              <input
                type="number"
                value={week}
                onChange={e => setWeek(e.target.value)}
                placeholder="e.g. 1"
                className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-3 text-[#FCFCFC] placeholder:text-[#6E9696]/50 outline-none focus:border-[#00D8D8] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#00D8D8] p-4 font-semibold text-[#04090A] hover:bg-[#00D8D8]/90 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Starting…' : 'Start Match Night'}
            </button>
          </form>
        </div>
      )}

      {/* ─── Step 2: Roll Call ─── */}
      {step === 'rollcall' && (
        <div>
          <h2 className={`${DISPLAY} text-2xl font-bold text-[#FCFCFC] mb-2`}>
            Roll Call
          </h2>
          <p className="text-[#6E9696] mb-6">Who is playing tonight?</p>

          <div className="space-y-2 mb-6 max-h-96 overflow-y-auto pr-1">
            {players.map(player => {
              const isPresent = presentNames.has(player.player_name)
              return (
                <div
                  key={player.id}
                  onClick={() => handleTogglePresent(player.player_name)}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    isPresent
                      ? 'border-[#00D8D8]/30 bg-[#00D8D8]/5'
                      : 'border-[#17393A] bg-[#04090A] opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-lg ${isPresent ? 'text-emerald-400' : 'text-[#6E9696]'}`}>
                      {isPresent ? '✅' : '❌'}
                    </span>
                    <span className="font-medium text-[#FCFCFC]">{player.player_name}</span>
                    {player.skill_level != null && (
                      <span className="text-xs bg-[#17393A] text-[#00D8D8] px-2 py-0.5 rounded font-bold">
                        SL {player.skill_level}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="text-sm text-[#6E9696] mb-4">
            {presentNames.size} player{presentNames.size !== 1 ? 's' : ''} checked in
          </div>

          <button
            onClick={() => setStep('lockin')}
            disabled={presentNames.size === 0}
            className="w-full rounded-xl bg-[#00D8D8] p-4 font-semibold text-[#04090A] hover:bg-[#00D8D8]/90 transition-all disabled:opacity-50"
          >
            Proceed to Match
          </button>
        </div>
      )}

      {/* ─── Step 3: Lock In & Results ─── */}
      {step === 'lockin' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className={`${DISPLAY} text-2xl font-bold text-[#FCFCFC]`}>
              Match Lineup &amp; Lock-In
            </h2>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                seniorCount > 2 ? 'bg-red-500/20 text-red-400' : 'bg-[#17393A] text-[#00D8D8]'
              }`}>
                Seniors (6+): {seniorCount}/2
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                slTotal > 23 ? 'bg-red-500/20 text-red-400' : 'bg-[#17393A] text-[#00D8D8]'
              }`}>
                SL Total: {slTotal}/23
              </div>
            </div>
          </div>

          {/* Strategy Advisor Banner */}
          <div className="rounded-xl border border-[#00D8D8]/30 bg-[#00D8D8]/5 p-3.5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-[#FCFCFC]">
              <span className="text-[#00D8D8] font-bold mr-1">💡 Match Strategy Advisor:</span>
              Run live win probabilities, senior checks, and put-up/counter recommendations against opponent rosters.
            </div>
            <a
              href="/table-i-cue"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center justify-center bg-[#00D8D8] text-[#04090A] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#00D8D8]/90 transition-colors"
            >
              Open Strategy Engine ↗
            </a>
          </div>

          <div className="space-y-3 mb-6">
            {rounds.map((round, index) => {
              // Players available: present, not already locked in another round
              const lockedNames = new Set(rounds.filter((r, i) => r.playerName && i !== index).map(r => r.playerName!))
              const available = players.filter(p =>
                presentNames.has(p.player_name) && !lockedNames.has(p.player_name)
              )

              return (
                <div key={index} className="rounded-xl border border-[#17393A] bg-[#04090A] p-4">
                  <div className="flex items-center gap-4">
                    <div className={`${DISPLAY} text-lg text-[#6E9696] font-bold w-8 shrink-0`}>
                      #{index + 1}
                    </div>

                    <div className="flex-1">
                      {round.playerName ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-[#FCFCFC]">{round.playerName}</span>
                            {round.playerSl != null && (
                              <span className="text-sm text-[#6E9696] ml-2">SL {round.playerSl}</span>
                            )}
                            <span className="text-[#FCC048] font-bold ml-3 text-sm">$10</span>
                          </div>

                          {/* Result buttons */}
                          {!round.result ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleResult(index, 'W')}
                                disabled={loading}
                                className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-4 py-1.5 text-emerald-400 font-bold text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                              >
                                W
                              </button>
                              <button
                                onClick={() => handleResult(index, 'L')}
                                disabled={loading}
                                className="rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-1.5 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50"
                              >
                                L
                              </button>
                            </div>
                          ) : (
                            <span className={`font-bold text-lg ${round.result === 'W' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {round.result === 'W' ? '✓ Win' : '✗ Loss'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <select
                          className="w-full rounded-lg border border-[#17393A] bg-[#0A1516] p-3 text-[#FCFCFC] outline-none focus:border-[#00D8D8] transition-colors"
                          defaultValue=""
                          onChange={e => { if (e.target.value) handleLockIn(index, e.target.value) }}
                          disabled={loading}
                        >
                          <option value="" disabled>Select player to lock in…</option>
                          {available.map(p => {
                            const found = ALL_TEAMS.flatMap(t => t.players).find(
                              tp => tp.name.toLowerCase() === p.player_name.toLowerCase() ||
                                   (tp.alias && tp.alias.toLowerCase() === p.player_name.toLowerCase())
                            )
                            const recordStr = found && found.wins != null && found.losses != null ? ` · ${found.wins}-${found.losses} (${Math.round((found.wins / (found.wins + found.losses)) * 100)}%)` : ''
                            return (
                              <option key={p.id} value={p.player_name}>
                                {p.player_name} (SL {p.skill_level ?? '–'}{recordStr})
                              </option>
                            )
                          })}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-[#17393A]/20 p-4 border border-[#17393A]">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#6E9696]">Total Fees Created</span>
              <span className="font-bold text-[#FCC048] text-lg">${totalFees.toFixed(2)}</span>
            </div>
            {slTotal > 23 && (
              <div className="mt-2 text-red-400 text-sm font-bold">
                ⚠️ SL total exceeds 23 — lineup is illegal!
              </div>
            )}
            {seniorCount > 2 && (
              <div className="mt-2 text-red-400 text-sm font-bold">
                ⚠️ Senior limit exceeded! Maximum 2 players at SL 6 or higher allowed per APA rules.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
