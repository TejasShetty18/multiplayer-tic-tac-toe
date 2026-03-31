import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { nakamaClient } from '../services/nakama';

export const Lobby: React.FC = () => {
    const { userId, matchId, displayName } = useGameStore();
    const [status, setStatus] = useState<string>('Connected as ' + (displayName || useGameStore.getState().username));
    const [isSearching, setIsSearching] = useState(false);



    const handleFindMatch = async () => {
        setIsSearching(true);
        setStatus('Searching for opponent...');
        try {
            await nakamaClient.findMatch(displayName || '');

            nakamaClient.onMatchmakerMatched(async (matched: any) => {
                setStatus('Match found! Joining...');

                // Extract opponent's display_name from matchmaker string_properties
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
                    console.error("Match join error", err);
                    setStatus('Failed to join match');
                    setIsSearching(false);
                }
            });
        } catch (err) {
            setStatus('Error finding match');
            setIsSearching(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white">
            <div className="w-full max-w-md p-8 bg-neutral-900 border border-neutral-800 shadow-2xl rounded-2xl">
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 mb-2 text-center">
                    Neon Tic-Tac-Toe
                </h1>
                <p className="text-neutral-400 text-center mb-8">
                    Multiplayer Server-Authoritative
                </p>

                <div className="bg-black/40 rounded-xl p-4 mb-6 border border-neutral-800">
                    <p className="text-sm font-medium text-neutral-300">Status</p>
                    <p className="text-emerald-400 text-sm">{status}</p>
                </div>

                <button
                    onClick={handleFindMatch}
                    disabled={!userId || isSearching || !!matchId}
                    className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition duration-200 shadow-[0_0_15px_rgba(16,185,129,0.5)] disabled:shadow-none"
                >
                    {isSearching ? <span className="animate-pulse">Finding Match...</span> : 'Find Match'}
                </button>
            </div>
        </div>
    );
};
