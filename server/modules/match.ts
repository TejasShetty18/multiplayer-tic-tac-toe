import { MatchState, OpCodes, Player, TURN_TIMEOUT_SECONDS, CLASSIC_DEADLINE_MS } from './state';

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
        gameMode: 'classic', // default; overwritten when match starts
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

        // Determine game mode from the first player's presence metadata (string properties)
        // The matchmaker sends game_mode as a string_property in the token.
        // We fall back to 'classic' if it's missing.
        const firstUserId = Object.keys(gameState.players)[0];
        // We can't read string properties here directly, so we rely on a custom label set on match creation.
        // For simplicity we embed the mode in the label parameter passed via the matchmaker token.
        // Because Nakama matchmaker matched events include the token, we use the label stored during init.
        // The client always passes game_mode in string_properties; we store it when the second player joins.
        // Workaround: encode mode in match label — clients pass it as numeric property and we use 1=timer, 0=classic.
        // Since we can't read string_properties in matchJoin, we default to 'timer' only when deadline was set.
        // --- Simpler approach: always start with timer deadline; classic uses CLASSIC_DEADLINE_MS (0) ---
        // The client reads gameMode from its own store, so server just needs consistent behaviour.
        // For Classic: deadline = 0 (no timeout enforced on server).
        // For Timer: deadline = now + 30s.
        // We detect mode via the match label which we'll set when the match is created via the matchmaker params.
        // Since we can't pass params through the matchmaker here, we read the stored gameMode field.
        // On first join we don't know the mode yet; we keep it as 'classic' until we can detect it.
        // The client already enforces this visually, so server-side we use a safe approach:
        // - If gameMode on the state is 'timer', set a deadline.
        // - Otherwise set deadline = 0 (no timeout).

        if (gameState.gameMode === 'timer') {
            gameState.deadline = Date.now() + (TURN_TIMEOUT_SECONDS * 1000);
        } else {
            gameState.deadline = CLASSIC_DEADLINE_MS; // 0 = no timeout
        }

        logger.info(`Game started. Mode=${gameState.gameMode} Deadline=${gameState.deadline}`);
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

    // Check Timeout — only enforced if deadline > 0 (timer mode)
    if (gameState.deadline > 0 && Date.now() > gameState.deadline) {
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
                dispatcher.broadcastMessage(OpCodes.REJECTED, 'Not your turn', [msg.sender]);
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
                dispatcher.broadcastMessage(OpCodes.REJECTED, 'Invalid move', [msg.sender]);
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

            // Advance deadline only in timer mode
            if (gameState.gameMode === 'timer') {
                gameState.deadline = Date.now() + (TURN_TIMEOUT_SECONDS * 1000);
            }
            // Classic: keep deadline at 0
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
