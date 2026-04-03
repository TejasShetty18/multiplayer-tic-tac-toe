var module = typeof module !== "undefined" ? module : { exports: {} };
var exports = typeof exports !== "undefined" ? exports : module.exports;
var OpCodes = {
    MOVE: 1,
    REJECTED: 3,
    GAME_OVER: 4,
    SYNC: 5,
};
var TURN_TIMEOUT_SECONDS = 30;
// A very large deadline effectively means "no timeout" for classic mode
var CLASSIC_DEADLINE_MS = 0; // 0 → server skips timeout check

var matchInit = function (ctx, logger, nk, params) {
    var gameMode = (params['game_mode'] === 'timer') ? 'timer' : 'classic';
    logger.info("Match spawned with game_mode=".concat(gameMode));
    var state = {
        board: Array(9).fill(null),
        players: {},
        activePlayer: null,
        winner: null,
        deadline: 0,
        state: 'waiting',
        gameMode: gameMode,
    };
    return {
        state: state,
        tickRate: 1, // 1 tick per second is enough for tic-tac-toe
        label: "tic-tac-toe-".concat(gameMode),
    };
};
var matchJoinAttempt = function (ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    var gameState = state;
    if (Object.keys(gameState.players).length >= 2) {
        return { state: state, accept: false, rejectMessage: 'Match is full' };
    }
    if (gameState.state !== 'waiting') {
        return { state: state, accept: false, rejectMessage: 'Game already started' };
    }
    return { state: state, accept: true };
};
var matchJoin = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    var gameState = state;
    for (var _i = 0, presences_1 = presences; _i < presences_1.length; _i++) {
        var presence = presences_1[_i];
        var mark = Object.keys(gameState.players).length === 0 ? 'X' : 'O';
        gameState.players[presence.userId] = {
            userId: presence.userId,
            sessionId: presence.sessionId,
            username: presence.username,
            mark: mark
        };
    }
    if (Object.keys(gameState.players).length === 2 && gameState.state === 'waiting') {
        gameState.state = 'playing';
        gameState.activePlayer = Object.keys(gameState.players).find(function (k) { return gameState.players[k].mark === 'X'; }) || null;
        // gameMode is already set correctly in matchInit from the matchmaker params.
        // Classic: deadline = 0 (no server-side timeout).
        // Timer:   deadline = now + 30s.
        if (gameState.gameMode === 'timer') {
            gameState.deadline = Date.now() + (TURN_TIMEOUT_SECONDS * 1000);
        }
        else {
            gameState.deadline = CLASSIC_DEADLINE_MS;
        }
        logger.info("Game started. Mode=".concat(gameState.gameMode, " Deadline=").concat(gameState.deadline));
        dispatcher.broadcastMessage(OpCodes.SYNC, JSON.stringify(gameState));
    }
    return { state: gameState };
};
var matchLeave = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    var gameState = state;
    if (gameState.state === 'playing') {
        var leftId_1 = presences[0].userId;
        var remainingId = Object.keys(gameState.players).find(function (k) { return k !== leftId_1; });
        if (remainingId) {
            gameState.winner = remainingId;
        }
        gameState.state = 'finished';
        dispatcher.broadcastMessage(OpCodes.GAME_OVER, JSON.stringify({ winner: gameState.winner, reason: 'disconnect' }));
        recordMatchResult(nk, logger, gameState.players, gameState.winner);
    }
    return null; // Match is complete and can end
};
var matchLoop = function (ctx, logger, nk, dispatcher, tick, state, messages) {
    var gameState = state;
    if (gameState.state !== 'playing') {
        return { state: gameState };
    }
    // Check Timeout — only enforced if deadline > 0 (timer mode)
    if (gameState.deadline > 0 && Date.now() > gameState.deadline) {
        var opponent = Object.keys(gameState.players).find(function (k) { return k !== gameState.activePlayer; });
        gameState.winner = opponent || null;
        gameState.state = 'finished';
        dispatcher.broadcastMessage(OpCodes.GAME_OVER, JSON.stringify({ winner: gameState.winner, reason: 'timeout' }));
        recordMatchResult(nk, logger, gameState.players, gameState.winner);
        return null; // End match
    }
    var boardChanged = false;
    var _loop_1 = function (msg) {
        if (msg.opCode === OpCodes.MOVE) {
            if (msg.sender.userId !== gameState.activePlayer) {
                dispatcher.broadcastMessage(OpCodes.REJECTED, 'Not your turn', [msg.sender]);
                return "continue";
            }
            var pos = void 0;
            try {
                var payload = JSON.parse(nk.binaryToString(msg.data));
                pos = payload.position;
            }
            catch (e) {
                return "continue";
            }
            if (pos < 0 || pos > 8 || gameState.board[pos] !== null) {
                dispatcher.broadcastMessage(OpCodes.REJECTED, 'Invalid move', [msg.sender]);
                return "continue";
            }
            var mark = gameState.players[msg.sender.userId].mark;
            gameState.board[pos] = mark;
            boardChanged = true;
            // Check win
            var winnerMark = checkWin(gameState.board);
            if (winnerMark) {
                gameState.winner = msg.sender.userId;
                gameState.state = 'finished';
                dispatcher.broadcastMessage(OpCodes.SYNC, JSON.stringify(gameState));
                dispatcher.broadcastMessage(OpCodes.GAME_OVER, JSON.stringify({ winner: gameState.winner, reason: 'win' }));
                recordMatchResult(nk, logger, gameState.players, gameState.winner);
                return { value: null };
            }
            else if (gameState.board.indexOf(null) === -1) {
                gameState.winner = 'DRAW';
                gameState.state = 'finished';
                dispatcher.broadcastMessage(OpCodes.SYNC, JSON.stringify(gameState));
                dispatcher.broadcastMessage(OpCodes.GAME_OVER, JSON.stringify({ winner: gameState.winner, reason: 'draw' }));
                recordMatchResult(nk, logger, gameState.players, gameState.winner);
                return { value: null };
            }
            // Next turn
            gameState.activePlayer = Object.keys(gameState.players).find(function (k) { return k !== msg.sender.userId; }) || null;
            // Advance deadline only in timer mode
            if (gameState.gameMode === 'timer') {
                gameState.deadline = Date.now() + (TURN_TIMEOUT_SECONDS * 1000);
            }
            // Classic: keep deadline at 0
        }
    };
    // Process messages
    for (var _i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
        var msg = messages_1[_i];
        var state_1 = _loop_1(msg);
        if (typeof state_1 === "object")
            return state_1.value;
    }
    if (boardChanged) {
        dispatcher.broadcastMessage(OpCodes.SYNC, JSON.stringify(gameState));
    }
    return { state: gameState };
};
var matchTerminate = function (ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
    return { state: state };
};
var matchSignal = function (ctx, logger, nk, dispatcher, tick, state, data) {
    return { state: state, data: data };
};
// --- Helper Functions ---
function checkWin(board) {
    var lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
        [0, 4, 8], [2, 4, 6] // Diagonals
    ];
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var _a = lines_1[_i], a = _a[0], b = _a[1], c = _a[2];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}
function recordMatchResult(nk, logger, players, winner) {
    for (var userId in players) {
        var winScore = 0;
        var lossInc = 0;
        var drawInc = 0;
        if (winner === 'DRAW') {
            drawInc = 1;
        }
        else if (winner === userId) {
            winScore = 1;
        }
        else if (winner !== null) {
            lossInc = 1;
        }
        try {
            var metadata = { losses: 0, draws: 0, currentStreak: 0, bestStreak: 0 };
            try {
                var records = nk.leaderboardRecordsList("ttt-wins", [userId], 1, null);
                if (records && records.ownerRecords && records.ownerRecords.length > 0) {
                    var currentMeta = records.ownerRecords[0].metadata || {};
                    metadata.losses = currentMeta.losses || 0;
                    metadata.draws = currentMeta.draws || 0;
                    metadata.currentStreak = currentMeta.currentStreak || 0;
                    metadata.bestStreak = currentMeta.bestStreak || 0;
                }
            }
            catch (err) {
                logger.error("Could not fetch leaderboard for user ".concat(userId, ": ").concat(err));
            }
            metadata.losses += lossInc;
            metadata.draws += drawInc;
            if (winScore > 0) {
                metadata.currentStreak += 1;
                metadata.bestStreak = Math.max(metadata.bestStreak, metadata.currentStreak);
            }
            else if (lossInc > 0 || drawInc > 0) {
                metadata.currentStreak = 0;
            }
            nk.leaderboardRecordWrite("ttt-wins", userId, players[userId].username, winScore, // adds 1 if win, 0 if loss/draw 
            0, metadata);
            logger.info("Recorded leaderboard stats for user ".concat(userId));
        }
        catch (e) {
            logger.error("Error writing leaderboard record for user ".concat(userId, ": ").concat(e));
        }
    }
}

// Must be a top-level named function (not inline) so Nakama's Goja runtime
// can extract the function name identifier when calling registerMatchmakerMatched.
function matchmakerMatched(ctx, logger, nk, matches) {
    var _a, _b, _c, _d, _e, _f;
    logger.info('Matchmaking completed, spawning authoritative match...');
    // Read game_mode from the first matched player's string properties.
    // All matched players share the same mode (enforced by the matchmaker query).
    var gameMode = ((_b = (_a = matches[0]) === null || _a === void 0 ? void 0 : _a.stringProperties) === null || _b === void 0 ? void 0 : _b['game_mode']) ||
        ((_d = (_c = matches[0]) === null || _c === void 0 ? void 0 : _c.string_properties) === null || _d === void 0 ? void 0 : _d['game_mode']) ||
        ((_f = (_e = matches[0]) === null || _e === void 0 ? void 0 : _e.properties) === null || _f === void 0 ? void 0 : _f['game_mode']) ||
        'classic';
    logger.info("Spawning match with game_mode=".concat(gameMode));
    var matchId = nk.matchCreate('tic-tac-toe', { game_mode: gameMode });
    return matchId;
}
// RPC: save_display_name
function saveDisplayName(ctx, logger, nk, payload) {
    if (!ctx.userId)
        throw new Error('Unauthenticated');
    var input = JSON.parse(payload);
    if (!input.displayName)
        throw new Error('Missing displayName');
    nk.accountUpdateId(ctx.userId, null, input.displayName, null, null, null, null, null);
    logger.info("Updated display name for user ".concat(ctx.userId, " to ").concat(input.displayName));
    return JSON.stringify({ success: true });
}
// RPC: get_leaderboard
function getLeaderboard(ctx, logger, nk, payload) {
    // Return records from ttt-wins.
    try {
        var records = nk.leaderboardRecordsList("ttt-wins", [], 100, null);
        return JSON.stringify({ entries: records.records });
    }
    catch (e) {
        logger.error("Error fetching leaderboard: ".concat(e));
        return JSON.stringify({ entries: [] });
    }
}
var InitModule = function (ctx, logger, nk, initializer) {
    logger.info('Initializing Tic-Tac-Toe Server Modules');
    // Register Authoritative Match
    initializer.registerMatch('tic-tac-toe', {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal
    });
    // Pass by reference so Nakama can extract the Identifier name.
    initializer.registerMatchmakerMatched(matchmakerMatched);
    // Register the RPCs that the client calls
    initializer.registerRpc('save_display_name', saveDisplayName);
    initializer.registerRpc('get_leaderboard', getLeaderboard);
    logger.info('Tic-Tac-Toe Server Modules Initialized');
};

module.exports = InitModule;
