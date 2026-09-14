'use client'

import React from 'react'
import type { PlayerSummary } from '@/lib/fees/types'
import { leaderboard } from '@/lib/fees/utils'

const DISPLAY = 'font-[family-name:var(--font-display)]'

interface LeaderboardProps {
  players: PlayerSummary[]
}

export default function Leaderboard({ players }: LeaderboardProps) {
  const rankedPlayers = leaderboard(players)
  const unrankedPlayers = players.filter(p => p.matches_played === 0)

  const getMedal = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return String(rank)
  }

  if (rankedPlayers.length === 0 && unrankedPlayers.length === 0) {
    return (
      <div className="rounded-2xl border border-[#17393A] bg-[#0A1516] p-12 text-center text-[#6E9696]">
        No stats yet. Play some matches to see the leaderboard!
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {rankedPlayers.length > 0 && (
        <div className="rounded-2xl border border-[#17393A] bg-[#0A1516] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#04090A] text-[#6E9696] border-b border-[#17393A]">
                <tr>
                  <th className="p-4 font-medium text-center w-16">Rank</th>
                  <th className="p-4 font-medium">Player</th>
                  <th className="p-4 font-medium text-center">W-L</th>
                  <th className="p-4 font-medium text-center">Win %</th>
                  <th className="p-4 font-medium text-center">Matches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17393A]">
                {rankedPlayers.map((player, index) => {
                  const rank = index + 1
                  const winPct = Math.round(player.win_rate * 100)
                  return (
                    <tr key={player.player_name} className="hover:bg-[#17393A]/30 transition-colors">
                      <td className="p-4 text-center text-lg font-bold">
                        {getMedal(rank)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#FCFCFC]">{player.player_name}</span>
                          {player.skill_level != null && (
                            <span className="text-xs text-[#6E9696]">SL {player.skill_level}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center text-[#FCFCFC] tabular-nums">
                        {player.wins}-{player.losses}
                      </td>
                      <td className="p-4 w-28">
                        <div className="flex flex-col gap-1 items-center">
                          <span className="font-bold text-[#FCC048]">{winPct}%</span>
                          <div className="w-full h-1.5 bg-[#04090A] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#FCC048] rounded-full transition-all"
                              style={{ width: `${winPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center text-[#6E9696]">
                        {player.matches_played}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {unrankedPlayers.length > 0 && (
        <div className="rounded-2xl border border-[#17393A] bg-[#0A1516] p-6">
          <h3 className={`${DISPLAY} text-lg text-[#6E9696] mb-3`}>
            Unranked (0 Matches)
          </h3>
          <div className="flex flex-wrap gap-2">
            {unrankedPlayers.map(p => (
              <span key={p.player_name} className="px-3 py-1 rounded-full bg-[#04090A] border border-[#17393A] text-[#FCFCFC] text-sm">
                {p.player_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
