import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Board } from '../components/game/Board';
import { User, Timer, Trophy, Infinity as InfinityIcon, LogOut } from 'lucide-react';
import { nakamaClient } from '../services/nakama';

export const Game: React.FC = () => {
    const {
        userId, displayName, opponentDisplayName,
        players, activePlayer, state,
        timerSeconds, matchId, gameMode, gameOverReason
    } = useGameStore();

    console.log('player', players);

    useEffect(() => {
        if (gameMode !== 'timer') return; // only tick in timer mode
        const interval = setInterval(() => {
            useGameStore.getState().tickTimer();
        }, 1000);
        return () => clearInterval(interval);
    }, [gameMode]);

    if (!matchId || !userId) return null;

    const myPlayer = players[userId];
    const opponentId = Object.keys(players).find(id => id !== userId);
    const opponentPlayer = opponentId ? players[opponentId] : null;

    const isMyTurn = activePlayer === userId;
    const isGameOver = state === 'finished';

    console.log("ismyTuren:  ", isMyTurn);


    // Remaining player: opponent abandoned → auto re-queue after 3s
    useEffect(() => {
        if (state === 'finished' && gameOverReason === 'abandoned') {
            const t = setTimeout(() => {
                useGameStore.getState().resetGame();
                useGameStore.getState().setAutoSearch(true);
            }, 3000);
            return () => clearTimeout(t);
        }
    }, [state, gameOverReason]);

    // Normal game over → navigate to Result page
    useEffect(() => {
        if (state === 'finished' && gameOverReason !== 'abandoned') {
            useGameStore.getState().setShowResult(true);
        }
    }, [state, gameOverReason]);



    const handleExplicitLeave = async () => {
        if (matchId) {
            await nakamaClient.leaveMatch(matchId);
        }
        useGameStore.getState().resetGame();
        useGameStore.getState().setIsConnected(false);
    };

    const isTimerMode = gameMode === 'timer';

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center py-12 px-4 text-white">
            {/* Player info / status bar */}
            <div className="w-full max-w-lg mb-8">
                {/* Mode badge */}
                <div className="flex justify-between items-center mb-4 px-2">
                    <span
                        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border ${isTimerMode
                            ? 'bg-amber-400/10 border-amber-400/30 text-amber-300'
                            : 'bg-teal-400/10 border-teal-400/30 text-teal-300'
                            }`}
                    >
                        {isTimerMode ? <Timer size={13} /> : <InfinityIcon size={13} />}
                        {isTimerMode ? 'Timer Mode' : 'Classic Mode'}
                    </span>

                    {!isGameOver && (
                        <button
                            onClick={handleExplicitLeave}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-rose-400 hover:text-white hover:bg-rose-500 border border-rose-500/30 hover:border-rose-500 rounded-full transition-colors"
                        >
                            <LogOut size={13} /> Leave Match
                        </button>
                    )}
                </div>

                <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-xl border border-neutral-800 shadow-xl">
                    {/* My Player Info */}
                    <div className="flex flex-col items-start space-y-1">
                        <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest flex items-center gap-1">
                            <User size={14} /> You
                        </span>
                        <span className="font-bold text-sm text-white truncate max-w-[7rem]">
                            {displayName || myPlayer?.username || 'Player'}
                        </span>
                        <span className="font-mono text-xl text-emerald-400 font-bold">
                            {myPlayer?.mark}
                        </span>
                    </div>

                    {/* Status / Timer */}
                    <div className="flex flex-col items-center">
                        {!isGameOver ? (
                            <div className="flex flex-col items-center gap-1">
                                <span
                                    className={`text-sm font-bold uppercase tracking-wider ${isMyTurn ? 'text-emerald-400 animate-pulse' : 'text-rose-400'
                                        }`}
                                >
                                    {isMyTurn ? 'Your Turn' : 'Opponent Turn'}
                                </span>

                                {/* Timer — only shown in timer mode */}
                                {isTimerMode && (
                                    <span
                                        className={`font-mono text-2xl font-bold flex items-center gap-2 ${timerSeconds < 10
                                            ? 'text-rose-500 animate-bounce'
                                            : 'text-neutral-200'
                                            }`}
                                    >
                                        <Timer size={20} />
                                        {timerSeconds}s
                                    </span>
                                )}

                                {/* Classic mode indicator */}
                                {!isTimerMode && (
                                    <span className="font-mono text-lg font-bold flex items-center gap-2 text-teal-400">
                                        <InfinityIcon size={20} />
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-1 text-center">
                                <span className="text-sm font-bold uppercase text-amber-400 flex items-center gap-1">
                                    <Trophy size={16} /> Game Over
                                </span>
                                {gameOverReason === 'abandoned' && (
                                    <span className="text-amber-400 font-bold text-sm">
                                        Match Abandoned
                                        <span className="block text-xs text-neutral-400 font-normal mt-1">
                                            Opponent left. Re-queuing in 3s...
                                        </span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Opponent Info */}
                    <div className="flex flex-col items-end space-y-1">
                        <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest flex items-center gap-1">
                            Opponent <User size={14} />
                        </span>
                        <span className="font-bold text-sm text-white truncate max-w-[7rem] text-right">
                            {opponentDisplayName || opponentPlayer?.username || 'Waiting...'}
                        </span>
                        <span className="font-mono text-xl text-rose-400 font-bold">
                            {opponentPlayer?.mark || '?'}
                        </span>
                    </div>
                </div>
            </div>

            <Board matchId={matchId} isMyTurn={isMyTurn && !isGameOver} myMark={myPlayer?.mark} />


        </div>
    );
};
