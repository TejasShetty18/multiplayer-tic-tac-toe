import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { nakamaClient } from '../services/nakama';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { User } from 'lucide-react';

export const Welcome: React.FC = () => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Please enter a display name');
            return;
        }

        if (trimmedName.length > 20) {
            setError('Name must be less than 20 characters');
            return;
        }

        setError('');
        setLoading(true);

        try {
            useGameStore.getState().setDisplayName(trimmedName);
            await nakamaClient.authenticate(trimmedName);
            // Save display name on server non-blocking (for leaderboard)
            nakamaClient.saveDisplayName(trimmedName).catch(() => {});
            useGameStore.getState().setIsConnected(true);
        } catch (err) {
            console.error('Connection error:', err);
            setError('Failed to connect to game server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-4">
            <div className="w-full max-w-sm p-8 bg-neutral-900 border border-neutral-800 shadow-[0_0_30px_rgba(16,185,129,0.15)] rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-emerald-500"></div>
                
                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 mb-2 text-center">
                    Neon Tic-Tac-Toe
                </h1>
                <p className="text-neutral-400 text-center mb-8 text-sm">
                    Enter your display name to join the server
                </p>

                <form onSubmit={handleConnect} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                            <User size={16} className="text-emerald-500" />
                            Display Name
                        </label>
                        <Input
                            placeholder="Enter your name..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading}
                            maxLength={20}
                            autoFocus
                            className="text-lg bg-black/50 border-neutral-800 focus-visible:ring-emerald-500/50"
                        />
                        {error && (
                            <p className="text-red-400 text-sm mt-1">{error}</p>
                        )}
                    </div>
                    
                    <Button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="w-full py-6 text-lg rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all duration-300 disabled:shadow-none"
                    >
                        {loading ? 'Connecting to Server...' : 'Connect & Play'}
                    </Button>
                </form>
            </div>
            
            <div className="mt-12 text-center text-neutral-500 text-sm max-w-sm flex gap-3 opacity-60">
                <div className="size-20 w-1/3 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center border-t-emerald-500/30 font-mono text-xl">X</div>
                <div className="size-20 w-1/3 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center font-mono text-xl text-teal-500">O</div>
                <div className="size-20 w-1/3 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center font-mono text-xl text-emerald-500">X</div>
            </div>
        </div>
    );
};
