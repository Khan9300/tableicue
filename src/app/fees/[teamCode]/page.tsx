'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { FeeTeam, FeeSession, FeeEntry, FeePlayer, PlayerSummary } from '@/lib/fees/types'
import { getTeamByCode, getAllSessions, getPlayers, getEntries, getMatchNights, addPlayer } from '@/lib/fees/api'
import { computeTeamSummary } from '@/lib/fees/utils'

import PinModal from '@/components/fees/PinModal'
import PlayerTable from '@/components/fees/PlayerTable'
import PlayerDetail from '@/components/fees/PlayerDetail'
import MatchNightPanel from '@/components/fees/MatchNightPanel'
import Leaderboard from '@/components/fees/Leaderboard'
import SessionSwitcher from '@/components/fees/SessionSwitcher'

const DISPLAY = 'font-[family-name:var(--font-display)]'

type Tab = 'roster' | 'matchnight' | 'leaderboard' | 'history'

const TAB_LABELS: Record<Tab, string> = {
  roster: 'Roster',
  matchnight: 'Match Night',
  leaderboard: 'Leaderboard',
  history: 'History',
}

export default function DashboardPage() {
  const params = useParams()
  const teamCode = params.teamCode as string

  const [team, setTeam] = useState<FeeTeam | null>(null)
  const [sessions, setSessions] = useState<FeeSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('')

  // Data for active session
  const [players, setPlayers] = useState<FeePlayer[]>([])
  const [entries, setEntries] = useState<FeeEntry[]>([])
  const [playerSummaries, setPlayerSummaries] = useState<PlayerSummary[]>([])
  const [matchNights, setMatchNights] = useState<{ id: string; match_date: string; opponent_name: string | null; week_number: number | null }[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Auth state
  const [pin, setPin] = useState('')
  const [isCaptain, setIsCaptain] = useState(false)
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)

  // UI State
  const [activeTab, setActiveTab] = useState<Tab>('roster')
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null)
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerSl, setNewPlayerSl] = useState('')
  const [addingPlayer, setAddingPlayer] = useState(false)

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team || !pin || !newPlayerName.trim()) return
    setAddingPlayer(true)
    try {
      await addPlayer({
        team_id: team.id,
        player_name: newPlayerName.trim(),
        skill_level: newPlayerSl ? parseInt(newPlayerSl) : undefined,
      }, pin)
      setNewPlayerName('')
      setNewPlayerSl('')
      setIsAddPlayerOpen(false)
      handleRefresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add player')
    } finally {
      setAddingPlayer(false)
    }
  }

  /** Load session-specific data: players, entries, match nights → compute summaries. */
  const loadSessionData = useCallback(async (teamId: string, sessionId: string) => {
    try {
      const [playersData, entriesData, matchNightsData] = await Promise.all([
        getPlayers(teamId),
        getEntries(teamId, sessionId),
        getMatchNights(sessionId),
      ])

      setPlayers(playersData)
      setEntries(entriesData)
      setMatchNights(matchNightsData)

      const summary = computeTeamSummary(entriesData, playersData)
      setPlayerSummaries(summary.players)
    } catch (err) {
      console.error('Failed to load session data:', err)
    }
  }, [])

  /** Initial load: fetch team, sessions, then session data. */
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const teamData = await getTeamByCode(teamCode)
        if (!teamData || cancelled) {
          if (!cancelled) setError('Team not found')
          return
        }
        setTeam(teamData)

        const sessionsData = await getAllSessions(teamData.id)
        if (cancelled) return
        setSessions(sessionsData)

        const active = sessionsData.find(s => s.is_active)
        const sessionId = active?.id ?? sessionsData[0]?.id ?? ''
        setActiveSessionId(sessionId)

        if (sessionId) {
          await loadSessionData(teamData.id, sessionId)
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load team data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [teamCode, loadSessionData])

  /** Switch session. */
  const handleSwitchSession = async (sessionId: string) => {
    if (!team) return
    setActiveSessionId(sessionId)
    await loadSessionData(team.id, sessionId)
  }

  /** PIN verified → captain mode. */
  const handleVerified = (verifiedPin: string, verifiedTeamId: string) => {
    if (team && team.id === verifiedTeamId) {
      setPin(verifiedPin)
      setIsCaptain(true)
    }
  }

  /** Refresh session data after a mutation. */
  const handleRefresh = () => {
    if (team && activeSessionId) {
      loadSessionData(team.id, activeSessionId)
    }
  }

  /* ========================= Loading / Error ========================= */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#17393A] border-t-[#00D8D8]" />
          <span className="text-[#6E9696] text-sm">Loading team…</span>
        </div>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
        <div className="text-red-400 text-lg">{error || 'Team not found'}</div>
        <Link href="/fees" className="text-[#00D8D8] hover:underline">← Return to Home</Link>
      </div>
    )
  }

  const selectedPlayer = selectedPlayerName
    ? playerSummaries.find(p => p.player_name === selectedPlayerName) ?? null
    : null

  /* ========================= Render ========================= */

  return (
    <div className="min-h-screen pb-20">
      {/* ─── Header ─── */}
      <header className="bg-[#0A1516] border-b border-[#17393A] sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Team info */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className={`${DISPLAY} text-3xl font-bold text-[#FCFCFC]`}>{team.team_name}</h1>
                <span className="bg-[#17393A] text-[#00D8D8] text-xs font-bold px-2 py-1 rounded uppercase">
                  {team.format === '8ball' ? '8-Ball' : '9-Ball'}
                </span>
              </div>
              <div className="text-[#6E9696] text-sm">
                {team.night && `${team.night}s`}{team.captain_name && ` · Capt: ${team.captain_name}`}
              </div>
            </div>

            {/* Session + Captain Login */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {sessions.length > 0 && (
                <SessionSwitcher
                  sessions={sessions}
                  activeSessionId={activeSessionId}
                  onSwitch={handleSwitchSession}
                />
              )}

              {!isCaptain ? (
                <button
                  onClick={() => setIsPinModalOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#17393A]/50 border border-[#17393A] px-4 py-2 text-[#00D8D8] hover:bg-[#17393A] transition-colors text-sm font-semibold"
                >
                  🔐 Captain Login
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-emerald-400 text-sm font-semibold">
                  🔓 Captain Mode
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 flex gap-6 overflow-x-auto">
          {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#00D8D8] text-[#00D8D8]'
                  : 'border-transparent text-[#6E9696] hover:text-[#FCFCFC]'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </header>

      {/* ─── Content ─── */}
      <main className="max-w-3xl mx-auto px-4 py-6">

        {/* Roster tab */}
        {activeTab === 'roster' && (
          <div className="space-y-6">
            <PlayerTable
              players={playerSummaries}
              onPlayerClick={setSelectedPlayerName}
              isCaptain={isCaptain}
            />
            {isCaptain && (
              <button
                onClick={() => setIsAddPlayerOpen(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-dashed border-[#17393A] text-[#6E9696] hover:text-[#00D8D8] hover:border-[#00D8D8] transition-colors text-sm font-semibold flex items-center justify-center gap-2"
              >
                <span>+</span> Add Player to Roster
              </button>
            )}
          </div>
        )}

        {/* Match Night tab */}
        {activeTab === 'matchnight' && (
          <div>
            {!isCaptain ? (
              <div className="rounded-2xl border border-[#17393A] bg-[#0A1516] p-12 text-center">
                <span className="text-4xl block mb-4">🔐</span>
                <h2 className={`${DISPLAY} text-2xl font-bold text-[#FCFCFC] mb-2`}>
                  Captain Access Required
                </h2>
                <p className="text-[#6E9696] mb-6">Log in to manage match nights and assign fees.</p>
                <button
                  onClick={() => setIsPinModalOpen(true)}
                  className="rounded-xl bg-[#00D8D8] px-6 py-3 font-semibold text-[#04090A] hover:bg-[#00D8D8]/90 transition-all"
                >
                  Log In Now
                </button>
              </div>
            ) : (
              <MatchNightPanel
                teamId={team.id}
                sessionId={activeSessionId}
                players={players}
                pin={pin}
                onUpdate={handleRefresh}
              />
            )}
          </div>
        )}

        {/* Leaderboard tab */}
        {activeTab === 'leaderboard' && (
          <Leaderboard players={playerSummaries} />
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {matchNights.length === 0 ? (
              <div className="rounded-2xl border border-[#17393A] bg-[#0A1516] p-12 text-center text-[#6E9696]">
                No match history for this session yet.
              </div>
            ) : (
              matchNights.map(mn => {
                const nightEntries = entries.filter(e => e.match_night_id === mn.id && !e.is_voided)
                const totalFees = nightEntries.length * 10
                const paidCount = nightEntries.filter(e => e.is_paid).length
                return (
                  <div key={mn.id} className="rounded-2xl border border-[#17393A] bg-[#0A1516] p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className={`${DISPLAY} text-lg font-bold text-[#FCFCFC]`}>
                          vs {mn.opponent_name ?? 'TBD'}
                        </div>
                        <div className="text-sm text-[#6E9696]">
                          {new Date(mn.match_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {mn.week_number != null && ` · Week ${mn.week_number}`}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-[#6E9696]">{nightEntries.length} player{nightEntries.length !== 1 ? 's' : ''}</div>
                        <div className={paidCount === nightEntries.length ? 'text-emerald-400' : 'text-red-400'}>
                          {paidCount}/{nightEntries.length} paid
                        </div>
                      </div>
                    </div>
                    {/* Round details */}
                    <div className="grid gap-2">
                      {nightEntries.sort((a, b) => (a.round_number ?? 0) - (b.round_number ?? 0)).map(e => (
                        <div key={e.id} className="flex items-center gap-3 text-sm">
                          <span className="text-[#6E9696] w-5 text-center">{e.round_number ?? '–'}</span>
                          <span className="text-[#FCFCFC] flex-1">{e.player_name}</span>
                          {e.result && (
                            <span className={e.result === 'W' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                              {e.result}
                            </span>
                          )}
                          <span className={e.is_paid ? 'text-emerald-400' : 'text-red-400'}>
                            {e.is_paid ? '✓ Paid' : '$10'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </main>

      {/* ─── Modals / Overlays ─── */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onVerified={handleVerified}
        teamCode={teamCode}
      />

      {selectedPlayer && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setSelectedPlayerName(null)}
          />
          <PlayerDetail
            player={selectedPlayer}
            teamId={team.id}
            isCaptain={isCaptain}
            pin={pin}
            onClose={() => setSelectedPlayerName(null)}
            onUpdate={handleRefresh}
          />
        </>
      )}

      {/* ─── Add Player Modal ─── */}
      {isAddPlayerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#17393A] bg-[#0A1516] p-6 shadow-xl relative">
            <button
              onClick={() => setIsAddPlayerOpen(false)}
              className="absolute top-4 right-4 text-[#6E9696] hover:text-[#FCFCFC] transition-colors"
            >
              ✕
            </button>
            <h2 className={`${DISPLAY} text-2xl font-bold text-[#FCFCFC] mb-4`}>
              Add Player to Roster
            </h2>
            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6E9696] mb-1 uppercase tracking-wider">
                  Player Name *
                </label>
                <input
                  type="text"
                  required
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  placeholder="e.g. Jason Krepel"
                  className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-3 text-[#FCFCFC] placeholder:text-[#6E9696]/40 focus:border-[#00D8D8] outline-none transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6E9696] mb-1 uppercase tracking-wider">
                  Skill Level (SL 1–9)
                </label>
                <input
                  type="number"
                  min="1"
                  max="9"
                  value={newPlayerSl}
                  onChange={e => setNewPlayerSl(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full rounded-xl border border-[#17393A] bg-[#04090A] p-3 text-[#FCFCFC] placeholder:text-[#6E9696]/40 focus:border-[#00D8D8] outline-none transition-colors"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPlayerOpen(false)}
                  className="flex-1 rounded-xl border border-[#17393A] bg-[#04090A] p-3 text-[#6E9696] hover:text-[#FCFCFC] font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingPlayer || !newPlayerName.trim()}
                  className="flex-1 rounded-xl bg-[#00D8D8] p-3 font-semibold text-[#04090A] hover:bg-[#00D8D8]/90 disabled:opacity-50 text-sm transition-all"
                >
                  {addingPlayer ? 'Adding…' : 'Add Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
