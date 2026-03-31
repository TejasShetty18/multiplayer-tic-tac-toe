import { create } from 'zustand';
import type { MatchData } from '@heroiclabs/nakama-js';

export interface Player {
    userId: string;
    sessionId: string;
    username: string;
    mark: 'X' | 'O';
}

export interface GameState {
    userId: string | null;
    username: string | null;
    displayName: string | null;
    opponentDisplayName: string | null;
    matchId: string | null;
    board: (string | null)[];
    players: { [userId: string]: Player };
    activePlayer: string | null;
    winner: string | null;
    deadline: number;
    state: 'waiting' | 'playing' | 'finished';
    timerSeconds: number;
    isConnected: boolean;
    
    setSession: (userId: string, username: string) => void;
    setDisplayName: (name: string) => void;
    setOpponentDisplayName: (name: string) => void;
    setIsConnected: (connected: boolean) => void;
    setMatch: (matchId: string) => void;
    handleMatchData: (data: MatchData) => void;
    handleDisconnect: () => void;
    tickTimer: () => void;
    resetGame: () => void;
}

const OpCodes = {
    MOVE: 1,
    MOVE_RESULT: 2,
    REJECTED: 3,
    GAME_OVER: 4,
    SYNC: 5,
};

export const useGameStore = create<GameState>((set, get) => ({
    userId: null,
    username: null,
    displayName: null,
    opponentDisplayName: null,
    matchId: null,
    board: Array(9).fill(null),
    players: {},
    activePlayer: null,
    winner: null,
    deadline: 0,
    state: 'waiting',
    timerSeconds: 30,
    isConnected: false,

    setSession: (userId, username) => set({ userId, username }),

    setDisplayName: (name) => set({ displayName: name }),

    setOpponentDisplayName: (name) => set({ opponentDisplayName: name }),
    
    setIsConnected: (connected) => set({ isConnected: connected }),
    
    setMatch: (matchId) => set({ matchId }),
    
    handleMatchData: (data: MatchData) => {
        const payloadStr = new TextDecoder().decode(data.data);
        if (!payloadStr) return;
        
        let payload: any = {};
        try {
             payload = JSON.parse(payloadStr);
        } catch(e) {}

        if (data.op_code === OpCodes.SYNC) {
            set((state) => ({
                ...state,
                board: payload.board,
                players: payload.players,
                activePlayer: payload.activePlayer,
                winner: payload.winner,
                deadline: payload.deadline,
                state: payload.state || state.state,
                timerSeconds: Math.max(0, Math.floor((payload.deadline - Date.now()) / 1000))
            }));
        } else if (data.op_code === OpCodes.GAME_OVER) {
            set(() => ({
                winner: payload.winner,
                state: 'finished'
            }));
        } else if (data.op_code === OpCodes.REJECTED) {
            console.warn("Move rejected:", payloadStr);
        }
    },
    
    handleDisconnect: () => {
         // Optionally handle disconnect
         set({ matchId: null, state: 'waiting' });
    },

    tickTimer: () => {
         const { deadline, state } = get();
         if (state === 'playing' && deadline) {
              set({ timerSeconds: Math.max(0, Math.floor((deadline - Date.now()) / 1000)) });
         }
    },
    
    resetGame: () => {
         set({
             matchId: null,
             board: Array(9).fill(null),
             players: {},
             activePlayer: null,
             winner: null,
             deadline: 0,
             state: 'waiting',
             timerSeconds: 30,
             isConnected: true // we keep connection state on reset
         });
    }
}));
