// Match State Interface
export interface Player {
    userId: string;
    sessionId: string;
    username: string;
    mark: 'X' | 'O';
}

export interface MatchState {
    board: (string | null)[];  // 9 cells
    players: { [userId: string]: Player }; // up to 2 players
    activePlayer: string | null; // userId of the player whose turn it is
    winner: string | null;     // userId or 'DRAW'
    deadline: number;          // timestamp for the turn timeout (0 = no timeout)
    state: 'waiting' | 'playing' | 'finished';
    gameMode: 'classic' | 'timer'; // game mode chosen by matched players
}

export const OpCodes = {
    MOVE: 1,
    MOVE_RESULT: 2,
    REJECTED: 3,
    GAME_OVER: 4,
    SYNC: 5,
};

export const TURN_TIMEOUT_SECONDS = 30;
// A very large deadline effectively means "no timeout" for classic mode
export const CLASSIC_DEADLINE_MS = 0; // 0 → server skips timeout check
