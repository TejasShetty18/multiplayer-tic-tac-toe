import { MatchState, OpCodes, Player, TURN_TIMEOUT_SECONDS } from './state';

export const matchInit = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    params: { [key: string]: string }
): { state: nkruntime.MatchState, tickRate: number, label: string } {
    logger.info('Match spawned');
    
    const state: MatchState = {
        board: Array(9).fill(null),
        players: {},
        activePlayer: null,
        winner: null,
        deadline: 0,
        state: 'waiting',
    };

    return {
        state,
        tickRate: 1, // 1 tick per second is enough for tic-tac-toe
        label: 'tic-tac-toe',
    };
};

export const matchJoinAttempt = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    presence: nkruntime.Presence,
    metadata: { [key: string]: any }
): { state: nkruntime.MatchState, accept: boolean, rejectMessage?: string } | null {
    const gameState = state as MatchState;
    if (Object.keys(gameState.players).length >= 2) {
        return { state, accept: false, rejectMessage: 'Match is full' };
    }
    if (gameState.state !== 'waiting') {
        return { state, accept: false, rejectMessage: 'Game already started' };
    }
    return { state, accept: true };
};

export const matchJoin = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    presences: nkruntime.Presence[]
): { state: nkruntime.MatchState } | null {
    const gameState = state as MatchState;
    
    for (const presence of presences) {
        const mark = Object.keys(gameState.players).length === 0 ? 'X' : 'O';
        gameState.players[presence.userId] = {
            userId: presence.userId,
            sessionId: presence.sessionId,
            username: presence.username,
            mark
        };
    }

    if (Object.keys(gameState.players).length === 2 && gameState.state === 'waiting') {
        gameState.state = 'playing';
        gameState.activePlayer = Object.keys(gameState.players).find(k => gameState.players[k].mark === 'X') || null;
        gameState.deadline = Date.now() + (TURN_TIMEOUT_SECONDS * 1000);
        
        logger.info('Game started with 2 players.');
        dispatcher.broadcastMessage(OpCodes.SYNC, JSON.stringify(gameState));
    }

    return { state: gameState };
};

export const matchLeave = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    presences: nkruntime.Presence[]
): { state: nkruntime.MatchState } | null {
    const gameState = state as MatchState;
    
    if (gameState.state === 'playing') {
        // Player abandoned game
        const leftId = presences[0].userId;
        const remainingId = Object.keys(gameState.players).find(k => k !== leftId);
        
        if (remainingId) {
            gameState.winner = remainingId;
        }
        gameState.state = 'finished';
        dispatcher.broadcastMessage(OpCodes.GAME_OVER, JSON.stringify({ winner: gameState.winner, reason: 'disconnect' }));
    }
    
    return null; // Match is complete and can end
};

export const matchLoop = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    messages: nkruntime.MatchMessage[]
): { state: nkruntime.MatchState } | null {
    const gameState = state as MatchState;
    
    if (gameState.state !== 'playing') {
        return { state: gameState };
    }

    // Check Timeout
    if (Date.now() > gameState.deadline) {
        // Active player timed out, other player wins
        const opponent = Object.keys(gameState.players).find(k => k !== gameState.activePlayer);
        gameState.winner = opponent || null;
        gameState.state = 'finished';
        dispatcher.broadcastMessage(OpCodes.GAME_OVER, JSON.stringify({ winner: gameState.winner, reason: 'timeout' }));
        return null; // End match
    }

    let boardChanged = false;

    // Process messages
    for (const msg of messages) {
        if (msg.opCode === OpCodes.MOVE) {
            if (msg.sender.userId !== gameState.activePlayer) {
                dispatcher.broadcastMessage(OpCodes.REJECTED, "Not your turn", [msg.sender]);
                continue;
            }
            
            let pos: number;
            try {
                const payload = JSON.parse(nk.binaryToString(msg.data));
                pos = payload.position;
            } catch (e) {
                continue;
            }

            if (pos < 0 || pos > 8 || gameState.board[pos] !== null) {
                dispatcher.broadcastMessage(OpCodes.REJECTED, "Invalid move", [msg.sender]);
                continue;
            }

            const mark = gameState.players[msg.sender.userId].mark;
            gameState.board[pos] = mark;
            boardChanged = true;
            
            // Check win
            const winnerMark = checkWin(gameState.board);
            if (winnerMark) {
                gameState.winner = msg.sender.userId;
                gameState.state = 'finished';
                dispatcher.broadcastMessage(OpCodes.SYNC, JSON.stringify(gameState));
                dispatcher.broadcastMessage(OpCodes.GAME_OVER, JSON.stringify({ winner: gameState.winner, reason: 'win' }));
                return null; // End match
            } else if (gameState.board.indexOf(null) === -1) {
                gameState.winner = 'DRAW';
                gameState.state = 'finished';
                dispatcher.broadcastMessage(OpCodes.SYNC, JSON.stringify(gameState));
                dispatcher.broadcastMessage(OpCodes.GAME_OVER, JSON.stringify({ winner: gameState.winner, reason: 'draw' }));
                return null; // End match
            }
            
            // Next turn
            gameState.activePlayer = Object.keys(gameState.players).find(k => k !== msg.sender.userId) || null;
            gameState.deadline = Date.now() + (TURN_TIMEOUT_SECONDS * 1000);
        }
    }

    if (boardChanged) {
        dispatcher.broadcastMessage(OpCodes.SYNC, JSON.stringify(gameState));
    }

    return { state: gameState };
};

export const matchTerminate = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    graceSeconds: number
): { state: nkruntime.MatchState } | null {
    return { state };
};

export const matchSignal = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    data: string
): { state: nkruntime.MatchState, data: string } | null {
    return { state, data };
};

// --- Helper Functions ---

function checkWin(board: (string | null)[]): string | null {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}
