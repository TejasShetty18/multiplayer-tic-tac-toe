import { create } from 'zustand';
import type { MatchData } from '@heroiclabs/nakama-js';

export type GameMode = 'classic' | 'timer';

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
    showLeaderboard: boolean;
    gameMode: GameMode;

    setSession: (userId: string, username: string) => void;
    setDisplayName: (name: string) => void;
    setOpponentDisplayName: (name: string) => void;
    setIsConnected: (connected: boolean) => void;
    setShowLeaderboard: (show: boolean) => void;
    setMatch: (matchId: string) => void;
    setGameMode: (mode: GameMode) => void;
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
    showLeaderboard: false,
    gameMode: 'classic',

    setSession: (userId, username) => set({ userId, username }),

    setDisplayName: (name) => set({ displayName: name }),

    setOpponentDisplayName: (name) => set({ opponentDisplayName: name }),

    setIsConnected: (connected) => set({ isConnected: connected }),

    setShowLeaderboard: (show) => set({ showLeaderboard: show }),

    setMatch: (matchId) => set({ matchId }),

    setGameMode: (mode) => set({ gameMode: mode }),

    handleMatchData: (data: MatchData) => {
        const payloadStr = new TextDecoder().decode(data.data);
        if (!payloadStr) return;

        let payload: any = {};
        try {
            payload = JSON.parse(payloadStr);
        } catch (e) { }

        if (data.op_code === OpCodes.SYNC) {
            const { gameMode } = get();
            const deadline = payload.deadline || 0;
            // In classic mode we don't show a countdown; keep timerSeconds high
            const timerSeconds =
                gameMode === 'timer'
                    ? Math.max(0, Math.floor((deadline - Date.now()) / 1000))
                    : Infinity;

            set((state) => ({
                ...state,
                board: payload.board,
                players: payload.players,
                activePlayer: payload.activePlayer,
                winner: payload.winner,
                deadline,
                state: payload.state || state.state,
                timerSeconds,
            }));
        } else if (data.op_code === OpCodes.GAME_OVER) {
            set(() => ({
                winner: payload.winner,
                state: 'finished',
            }));
        } else if (data.op_code === OpCodes.REJECTED) {
            console.warn('Move rejected:', payloadStr);
        }
    },

    handleDisconnect: () => {
        set({ matchId: null, state: 'waiting' });
    },

    tickTimer: () => {
        const { deadline, state, gameMode } = get();
        if (state === 'playing' && deadline && gameMode === 'timer') {
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
            isConnected: true,
        });
    },
}));
