import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Board } from '../components/game/Board';
import { User, Timer, Trophy } from 'lucide-react';
export const Game: React.FC = () => {
    const { userId, displayName, opponentDisplayName, players, activePlayer, winner, state, timerSeconds, matchId } = useGameStore();

    console.log("player", players);

    useEffect(() => {
        const interval = setInterval(() => {
            useGameStore.getState().tickTimer();
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!matchId || !userId) return null;

    const myPlayer = players[userId];
    const opponentId = Object.keys(players).find(id => id !== userId);
    const opponentPlayer = opponentId ? players[opponentId] : null;

    const isMyTurn = activePlayer === userId;
    const isGameOver = state === 'finished';

    const handleLeave = () => {
        // Simple reload to drop connection
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center py-12 px-4 text-white">
            <div className="w-full max-w-lg mb-8 flex justify-between items-center bg-neutral-900 p-4 rounded-xl border border-neutral-800 shadow-xl">
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
                            <span className={`text-sm font-bold uppercase tracking-wider ${isMyTurn ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`}>
                                {isMyTurn ? 'Your Turn' : 'Opponent Turn'}
                            </span>
                            <span className={`font-mono text-2xl font-bold flex items-center gap-2 ${timerSeconds < 10 ? 'text-rose-500 animate-bounce' : 'text-neutral-200'}`}>
                                <Timer size={20} /> {timerSeconds}s
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-1 text-center">
                            <span className="text-sm font-bold uppercase text-amber-400 flex items-center gap-1">
                                <Trophy size={16} /> Game Over
                            </span>
                            <span className="font-bold text-xl text-white">
                                {winner === userId ? <span className="text-emerald-400">You Won!</span> :
                                    winner === 'DRAW' ? <span className="text-neutral-400">It's a Draw</span> :
                                        <span className="text-rose-500">You Lost</span>}
                            </span>
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

            <Board matchId={matchId} isMyTurn={isMyTurn && !isGameOver} myMark={myPlayer?.mark} />

            {isGameOver && (
                <div className="mt-12 flex justify-center">
                    <button
                        onClick={handleLeave}
                        className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition transform hover:scale-105 active:scale-95 uppercase tracking-widest"
                    >
                        Back to Lobby
                    </button>
                </div>
            )}
        </div>
    );
};
