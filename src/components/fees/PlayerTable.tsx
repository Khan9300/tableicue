'use client'

import React, { useMemo } from 'react'
import type { PlayerSummary } from '@/lib/fees/types'
import { formatCurrency } from '@/lib/fees/utils'

interface PlayerTableProps {
  players: PlayerSummary[]
  onPlayerClick: (name: string) => void
  isCaptain: boolean
}

const DISPLAY = 'font-[family-name:var(--font-display)]'

export default function PlayerTable({ players, onPlayerClick, isCaptain }: PlayerTableProps) {
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      // Highest balance (most owed) first, then alphabetical
      if (b.balance !== a.balance) return b.balance - a.balance
      return a.player_name.localeCompare(b.player_name)
    })
  }, [players])

  if (!players || players.length === 0) {
    return (
      <div className="rounded-2xl border border-[#17393A] bg-[#0A1516] p-12 text-center text-[#6E9696]">
        No players yet. Add players to get started.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#17393A] bg-[#0A1516] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#04090A] text-[#6E9696] border-b border-[#17393A]">
            <tr>
              <th className="p-4 font-medium">Player</th>
              <th className="p-4 font-medium text-center">SL</th>
              <th className="p-4 font-medium text-center">W-L</th>
              <th className="p-4 font-medium text-right">Balance</th>
              <th className="p-4 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#17393A]">
            {sortedPlayers.map(player => {
              const isOwed = player.balance > 0
              return (
                <tr
                  key={player.player_name}
                  onClick={() => onPlayerClick(player.player_name)}
                  className="hover:bg-[#17393A]/30 cursor-pointer transition-colors"
                >
                  <td className="p-4">
                    <span className="font-bold text-[#FCFCFC]">{player.player_name}</span>
                  </td>
                  <td className="p-4 text-center">
                    {player.skill_level != null ? (
                      <span className="inline-flex items-center justify-center bg-[#00D8D8]/20 text-[#00D8D8] text-xs font-bold rounded-full w-7 h-7">
                        {player.skill_level}
                      </span>
                    ) : (
                      <span className="text-[#6E9696]">–</span>
                    )}
                  </td>
                  <td className="p-4 text-center text-[#FCFCFC] tabular-nums">
                    {player.matches_played > 0 ? (
                      <span>{player.wins}-{player.losses}</span>
                    ) : player.historical_wins != null ? (
                      <div className="flex flex-col items-center">
                        <span className="font-semibold">{player.historical_wins}-{player.historical_losses}</span>
                        <span className="text-[10px] text-[#6E9696] font-medium tracking-wider">Summer &apos;26 ({Math.round((player.historical_win_rate ?? 0) * 100)}%)</span>
                      </div>
                    ) : (
                      <span className="text-[#6E9696]">0-0</span>
                    )}
                  </td>
                  <td className={`p-4 text-right font-semibold tabular-nums ${
                    isOwed ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {formatCurrency(player.balance)}
                  </td>
                  <td className="p-4 text-center text-lg">
                    {isOwed ? '🔴' : '✅'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
