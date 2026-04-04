import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { nakamaClient } from '../services/nakama';
import type { GameMode } from '../store/gameStore';
import { Timer, Infinity as InfinityIcon, Swords, Zap, Trophy, ArrowLeft } from 'lucide-react';

export const Lobby: React.FC = () => {
    const { userId, matchId, displayName, gameMode, setGameMode, autoSearch, setAutoSearch, setIsConnected } = useGameStore();
    const [status, setStatus] = useState<string>('');
    const [isSearching, setIsSearching] = useState(false);

    const handleFindMatch = async () => {
        setIsSearching(true);
        setStatus('Searching for opponent...');
        try {
            await nakamaClient.findMatch(displayName || '', gameMode);

            nakamaClient.onMatchmakerMatched(async (matched: any) => {
                setStatus('Match found! Joining...');

                const myUserId = useGameStore.getState().userId;
                const opponentEntry = (matched.users || []).find(
                    (u: any) => u.presence?.userId !== myUserId && u.presence?.user_id !== myUserId
                );
                const opponentName =
                    opponentEntry?.string_properties?.display_name ||
                    opponentEntry?.presence?.username ||
                    'Opponent';
                useGameStore.getState().setOpponentDisplayName(opponentName);

                try {
                    const matchIdToJoin = matched.matchId || matched.match_id || matched.token;
                    const match = await nakamaClient.joinMatch(matchIdToJoin);
                    useGameStore.getState().setMatch(match.match_id);
                } catch (err: any) {
                    console.error('Match join error', err);
                    setStatus('Failed to join match');
                    setIsSearching(false);
                }
            });
        } catch (err) {
            setStatus('Error finding match');
            setIsSearching(false);
        }
    };

    useEffect(() => {
        if (autoSearch && displayName && !isSearching) {
            setAutoSearch(false);
            handleFindMatch();
        }
    }, [autoSearch, displayName, isSearching]);

    const handleCancelSearch = () => {
        window.location.reload();
    };

    const modes: { id: GameMode; label: string; icon: React.ReactNode; description: string; accent: string }[] = [
        {
            id: 'classic',
            label: 'Classic',
            icon: <InfinityIcon size={28} />,
            description: 'No time limit. Think at your own pace.',
            accent: 'teal',
        },
        {
            id: 'timer',
            label: 'Timer',
            icon: <Timer size={28} />,
            description: '30 seconds per turn. Stay sharp!',
            accent: 'amber',
        },
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-4">
            {/* Back Button */}
            <button
                onClick={() => setIsConnected(false)}
                disabled={isSearching}
                className="absolute top-6 left-6 flex items-center gap-2 text-neutral-500 hover:text-teal-400
                    transition-colors duration-200 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
            >
                <ArrowLeft size={18} /> Back
            </button>
            {/* Header */}
            <div className="w-full max-w-md mb-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <Swords size={32} className="text-teal-400" />
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500">
                        Neon Tic‑Tac‑Toe
                    </h1>
                </div>
                <p className="text-neutral-400 text-sm">
                    Welcome back,{' '}
                    <span className="text-emerald-400 font-semibold">{displayName || 'Player'}</span>!
                </p>
            </div>

            {/* Card */}
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 shadow-[0_0_40px_rgba(16,185,129,0.1)] rounded-2xl overflow-hidden">
                {/* Top accent bar */}
                <div className="h-1 w-full bg-gradient-to-r from-teal-400 to-emerald-500" />

                <div className="p-8 space-y-8">
                    {/* Mode Selector */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4 flex items-center gap-2">
                            <Zap size={14} className="text-teal-400" /> Select Game Mode
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            {modes.map((mode) => {
                                const isActive = gameMode === mode.id;
                                const accentMap: Record<string, string> = {
                                    teal: isActive
                                        ? 'border-teal-400 bg-teal-400/10 shadow-[0_0_20px_rgba(45,212,191,0.2)]'
                                        : 'border-neutral-700 hover:border-teal-500/50 hover:bg-teal-400/5',
                                    amber: isActive
                                        ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                                        : 'border-neutral-700 hover:border-amber-500/50 hover:bg-amber-400/5',
                                };
                                const iconColor: Record<string, string> = {
                                    teal: isActive ? 'text-teal-400' : 'text-neutral-500',
                                    amber: isActive ? 'text-amber-400' : 'text-neutral-500',
                                };
                                const labelColor: Record<string, string> = {
                                    teal: isActive ? 'text-teal-300' : 'text-neutral-300',
                                    amber: isActive ? 'text-amber-300' : 'text-neutral-300',
                                };

                                return (
                                    <button
                                        key={mode.id}
                                        onClick={() => !isSearching && setGameMode(mode.id)}
                                        disabled={isSearching}
                                        className={`
                                            relative flex flex-col items-center gap-3 p-5 rounded-xl border-2
                                            transition-all duration-300 cursor-pointer text-center
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                            ${accentMap[mode.accent]}
                                        `}
                                    >
                                        {/* Active badge */}
                                        {isActive && (
                                            <span
                                                className={`absolute top-2 right-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${mode.accent === 'teal'
                                                    ? 'bg-teal-500/20 text-teal-300'
                                                    : 'bg-amber-500/20 text-amber-300'
                                                    }`}
                                            >
                                                Selected
                                            </span>
                                        )}
                                        <span className={`transition-colors duration-300 ${iconColor[mode.accent]}`}>
                                            {mode.icon}
                                        </span>
                                        <div>
                                            <p className={`font-bold text-sm transition-colors duration-300 ${labelColor[mode.accent]}`}>
                                                {mode.label}
                                            </p>
                                            <p className="text-neutral-500 text-xs mt-1 leading-snug">
                                                {mode.description}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Status */}
                    {(status || isSearching) && (
                        <div className="bg-black/40 rounded-xl p-4 border border-neutral-800 flex items-center gap-3">
                            {isSearching && (
                                <span className="flex-shrink-0 inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                            )}
                            <p className={`text-sm ${isSearching ? 'text-emerald-400' : 'text-neutral-400'}`}>
                                {status}
                            </p>
                        </div>
                    )}

                    {/* Action Button */}
                    {!isSearching ? (
                        <button
                            onClick={handleFindMatch}
                            disabled={!userId || !!matchId}
                            className="w-full py-4 px-4 bg-gradient-to-r from-teal-500 to-emerald-500
                                hover:from-teal-400 hover:to-emerald-400
                                disabled:opacity-50 disabled:cursor-not-allowed
                                text-black font-extrabold rounded-xl transition-all duration-300
                                shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]
                                disabled:shadow-none text-base uppercase tracking-wider
                                transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Find Match
                        </button>
                    ) : (
                        <button
                            onClick={handleCancelSearch}
                            className="w-full py-4 px-4 bg-neutral-800 hover:bg-neutral-700
                                text-neutral-300 font-bold rounded-xl transition-all duration-200
                                border border-neutral-700 hover:border-neutral-600
                                uppercase tracking-wider text-sm"
                        >
                            Cancel Search
                        </button>
                    )}
                </div>
            </div>

            {/* Leaderboard button */}
            <button
                onClick={() => useGameStore.getState().setShowLeaderboard(true)}
                className="mt-6 flex items-center gap-2 text-neutral-500 hover:text-amber-400 transition-colors duration-200 text-sm font-medium"
            >
                <Trophy size={16} /> View Global Leaderboard
            </button>

            {/* Bottom hint */}
            <p className="mt-6 text-neutral-600 text-xs text-center max-w-xs">
                You'll be matched with another player who chose the same mode.
            </p>
        </div>
    );
};
