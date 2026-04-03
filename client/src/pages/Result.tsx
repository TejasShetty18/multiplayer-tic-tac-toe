import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Trophy, Swords, LayoutList, Home } from 'lucide-react';

export const Result: React.FC = () => {
    const {
        userId,
        displayName,
        opponentDisplayName,
        players,
        winner,
    } = useGameStore();

    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Slight delay so the entry animation fires after mount
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    const opponentId = Object.keys(players).find(id => id !== userId);
    const myPlayer = userId ? players[userId] : null;
    const opponentPlayer = opponentId ? players[opponentId] : null;

    const myName = displayName || myPlayer?.username || 'You';
    const oppName = opponentDisplayName || opponentPlayer?.username || 'Opponent';

    const isDraw = winner === 'DRAW';
    const iWon = winner === userId;
    const iLost = !isDraw && !iWon;

    const handleBackToLobby = () => {
        useGameStore.getState().resetGame();
    };

    const handleLeaderboard = () => {
        // Stay on result briefly then go to leaderboard
        useGameStore.getState().resetGame();
        useGameStore.getState().setShowLeaderboard(true);
    };

    // ── Derived styles ────────────────────────────────────────────────────────
    const resultLabel = isDraw ? "It's a Draw!" : iWon ? 'Victory!' : 'Defeat';
    const resultSub = isDraw
        ? 'A hard-fought battle with no clear winner.'
        : iWon
        ? 'You outplayed your opponent. Well done!'
        : 'Better luck next time. Keep grinding!';

    const glowColor = isDraw
        ? 'rgba(163,163,163,0.25)'
        : iWon
        ? 'rgba(16,185,129,0.3)'
        : 'rgba(239,68,68,0.25)';

    const accentGradient = isDraw
        ? 'from-neutral-400 to-neutral-500'
        : iWon
        ? 'from-teal-400 to-emerald-500'
        : 'from-rose-500 to-red-600';

    const topBarGradient = isDraw
        ? 'from-neutral-500 to-neutral-600'
        : iWon
        ? 'from-teal-400 to-emerald-500'
        : 'from-rose-500 to-red-500';

    const trophyColor = isDraw
        ? 'text-neutral-400'
        : iWon
        ? 'text-amber-400'
        : 'text-rose-400';

    const trophyGlow = isDraw
        ? ''
        : iWon
        ? 'drop-shadow-[0_0_18px_rgba(251,191,36,0.7)]'
        : 'drop-shadow-[0_0_18px_rgba(239,68,68,0.6)]';

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4 py-12 text-white">
            {/* Animated card */}
            <div
                className={`w-full max-w-md transition-all duration-700 ${
                    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ filter: `drop-shadow(0 0 48px ${glowColor})` }}
            >
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                    {/* Top accent bar */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${topBarGradient}`} />

                    <div className="px-8 py-10 flex flex-col items-center gap-6">
                        {/* Trophy Icon */}
                        <div
                            className={`transition-all duration-700 delay-100 ${
                                visible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                            }`}
                        >
                            <Trophy size={64} className={`${trophyColor} ${trophyGlow}`} />
                        </div>

                        {/* Result headline */}
                        <div className="text-center">
                            <h1
                                className={`text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${accentGradient} leading-tight`}
                            >
                                {resultLabel}
                            </h1>
                            <p className="text-neutral-400 text-sm mt-2">{resultSub}</p>
                        </div>

                        {/* Players card */}
                        <div className="w-full bg-black/30 border border-neutral-800 rounded-xl p-5 flex items-center justify-between gap-4">
                            {/* Me */}
                            <div className="flex flex-col items-center gap-2 flex-1">
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-xl border-2 ${
                                        iWon
                                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                            : isDraw
                                            ? 'bg-neutral-700/40 border-neutral-500 text-neutral-300'
                                            : 'bg-rose-500/10 border-rose-500/40 text-neutral-500'
                                    }`}
                                >
                                    {myName.charAt(0).toUpperCase()}
                                </div>
                                <p className="font-bold text-sm text-white text-center max-w-[7rem] truncate">
                                    {myName}
                                </p>
                                <span
                                    className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                        iWon
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : isDraw
                                            ? 'bg-neutral-700 text-neutral-400'
                                            : 'bg-rose-500/10 text-rose-400'
                                    }`}
                                >
                                    {iWon ? 'Winner' : isDraw ? 'Draw' : 'Loser'}
                                </span>
                                <span className="font-mono text-lg font-bold text-neutral-400">
                                    {myPlayer?.mark || '?'}
                                </span>
                            </div>

                            {/* VS divider */}
                            <div className="flex flex-col items-center gap-1.5 shrink-0">
                                <Swords size={22} className="text-neutral-600" />
                                <span className="text-neutral-600 text-xs font-bold uppercase tracking-widest">
                                    vs
                                </span>
                            </div>

                            {/* Opponent */}
                            <div className="flex flex-col items-center gap-2 flex-1">
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-xl border-2 ${
                                        iLost
                                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                            : isDraw
                                            ? 'bg-neutral-700/40 border-neutral-500 text-neutral-300'
                                            : 'bg-rose-500/10 border-rose-500/40 text-neutral-500'
                                    }`}
                                >
                                    {oppName.charAt(0).toUpperCase()}
                                </div>
                                <p className="font-bold text-sm text-white text-center max-w-[7rem] truncate">
                                    {oppName}
                                </p>
                                <span
                                    className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                        iLost
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : isDraw
                                            ? 'bg-neutral-700 text-neutral-400'
                                            : 'bg-rose-500/10 text-rose-400'
                                    }`}
                                >
                                    {iLost ? 'Winner' : isDraw ? 'Draw' : 'Loser'}
                                </span>
                                <span className="font-mono text-lg font-bold text-neutral-400">
                                    {opponentPlayer?.mark || '?'}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="w-full flex flex-col gap-3 mt-2">
                            <button
                                onClick={handleBackToLobby}
                                className="w-full py-4 px-4 bg-gradient-to-r from-teal-500 to-emerald-500
                                    hover:from-teal-400 hover:to-emerald-400
                                    text-black font-extrabold rounded-xl transition-all duration-300
                                    shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_30px_rgba(16,185,129,0.55)]
                                    text-sm uppercase tracking-wider transform hover:scale-[1.02] active:scale-[0.98]
                                    flex items-center justify-center gap-2"
                            >
                                <Home size={17} /> Back to Lobby
                            </button>

                            <button
                                onClick={handleLeaderboard}
                                className="w-full py-4 px-4 bg-neutral-800 hover:bg-neutral-700
                                    text-neutral-300 hover:text-amber-400 font-bold rounded-xl transition-all duration-200
                                    border border-neutral-700 hover:border-amber-500/50
                                    text-sm uppercase tracking-wider
                                    flex items-center justify-center gap-2"
                            >
                                <LayoutList size={17} /> View Leaderboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subtle bottom hint */}
            <p className="mt-8 text-neutral-600 text-xs text-center">
                Your stats have been updated on the global leaderboard.
            </p>
        </div>
    );
};
