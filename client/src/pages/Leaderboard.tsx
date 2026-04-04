import React, { useEffect, useState } from 'react';
import { nakamaClient } from '../services/nakama';
import { useGameStore } from '../store/gameStore';
import { Trophy, ArrowLeft, RefreshCw, Flame, TrendingUp } from 'lucide-react';

interface LeaderboardEntry {
    rank: number;
    userId: string;
    displayName: string;
    wins: number;
    losses: number;
    draws: number;
    bestStreak: number;
    currentStreak: number;
}

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return <span className="text-neutral-400 font-bold text-sm w-8 text-center">#{rank}</span>;
};

export const Leaderboard: React.FC = () => {
    const { userId } = useGameStore();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchLeaderboard = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await nakamaClient.getLeaderboard();
            setEntries(data);
        } catch (e) {
            setError('Failed to load leaderboard. Try again later.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const winRate = (e: LeaderboardEntry) => {
        const total = e.wins + e.losses + e.draws;
        if (total === 0) return '—';
        return Math.round((e.wins / total) * 100) + '%';
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center py-10 px-4">
            {/* Header */}
            <div className="w-full max-w-3xl mb-8">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => useGameStore.getState().setShowLeaderboard(false)}
                        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm font-medium"
                    >
                        <ArrowLeft size={18} /> Back to Lobby
                    </button>
                    <button
                        onClick={fetchLeaderboard}
                        disabled={loading}
                        className="flex items-center gap-2 text-neutral-400 hover:text-emerald-400 transition-colors text-sm font-medium disabled:opacity-40"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <div className="flex justify-center mb-3">
                        <Trophy size={40} className="text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-1">
                        Global Rankings
                    </h1>
                    <p className="text-neutral-400 text-sm">Top Neon Tic-Tac-Toe players worldwide</p>
                </div>
            </div>

            {/* Table */}
            <div className="w-full max-w-3xl overflow-x-auto pb-4">
                {loading ? (
                    <div className="flex flex-col items-center py-20 text-neutral-500">
                        <RefreshCw size={32} className="animate-spin mb-4 text-emerald-500" />
                        <p>Loading rankings...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 text-rose-400">{error}</div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-20 text-neutral-500">
                        <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-semibold">No rankings yet</p>
                        <p className="text-sm mt-1">Play your first game to appear on the board!</p>
                    </div>
                ) : (
                    <div className="min-w-[600px] rounded-2xl border border-neutral-800 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                        {/* Table Header */}
                        <div className="grid grid-cols-[3rem_1fr_5rem_5rem_5rem_6rem_5rem] bg-neutral-900 border-b border-neutral-800 px-4 py-3 text-xs uppercase tracking-widest text-neutral-500 font-bold">
                            <div>Rank</div>
                            <div>Player</div>
                            <div className="text-center text-emerald-500">Wins</div>
                            <div className="text-center text-rose-400">Losses</div>
                            <div className="text-center text-neutral-400">Draws</div>
                            <div className="text-center text-orange-400 flex items-center justify-center gap-1">
                                <Flame size={12} /> Streak
                            </div>
                            <div className="text-center text-blue-400 flex items-center justify-center gap-1">
                                <TrendingUp size={12} /> WR
                            </div>
                        </div>

                        {/* Rows */}
                        {entries.map((entry) => {
                            const isMe = entry.userId === userId;
                            return (
                                <div
                                    key={entry.userId}
                                    className={`grid grid-cols-[3rem_1fr_5rem_5rem_5rem_6rem_5rem] px-4 py-4 border-b border-neutral-800/60 last:border-0 transition-colors ${isMe
                                        ? 'bg-emerald-950/40 border-l-2 border-l-emerald-500'
                                        : 'bg-neutral-900/50 hover:bg-neutral-800/40'
                                        }`}
                                >
                                    <div className="flex items-center">
                                        <RankBadge rank={entry.rank} />
                                    </div>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`size-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isMe ? 'bg-emerald-500 text-black' : 'bg-neutral-700 text-neutral-300'}`}>
                                            {(entry.displayName || 'P').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`font-semibold text-sm truncate ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                                                {entry.displayName || 'Player'}
                                                {isMe && <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-normal">You</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center font-bold text-emerald-400">{entry.wins}</div>
                                    <div className="flex items-center justify-center font-bold text-rose-400">{entry.losses}</div>
                                    <div className="flex items-center justify-center font-bold text-neutral-400">{entry.draws}</div>
                                    <div className="flex items-center justify-center gap-1 font-bold text-orange-400">
                                        {entry.bestStreak > 0 && <Flame size={14} />}
                                        {entry.bestStreak}
                                    </div>
                                    <div className="flex items-center justify-center font-bold text-blue-400 text-sm">{winRate(entry)}</div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Your stats at bottom if not on leaderboard */}
                {!loading && entries.length > 0 && !entries.find(e => e.userId === userId) && (
                    <p className="text-center text-neutral-500 text-sm mt-6">
                        You're not on the board yet — win a game to join the rankings!
                    </p>
                )}
            </div>
        </div>
    );
};
