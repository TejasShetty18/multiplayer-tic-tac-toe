import { matchInit, matchJoinAttempt, matchJoin, matchLeave, matchLoop, matchTerminate, matchSignal } from './match';

// Must be a top-level named function (not inline) so Nakama's Goja runtime
// can extract the function name identifier when calling registerMatchmakerMatched.
function matchmakerMatched(
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    matches: nkruntime.MatchmakerResult[]
): string {
    logger.info('Matchmaking completed, spawning authoritative match...');

    // Read game_mode from the first matched player's string properties.
    // All matched players share the same mode (enforced by the matchmaker query).
    const gameMode: string =
        (matches[0] as any)?.stringProperties?.['game_mode'] ||
        (matches[0] as any)?.string_properties?.['game_mode'] ||
        (matches[0] as any)?.properties?.['game_mode'] ||
        'classic';
    logger.info(`Spawning match with game_mode=${gameMode}`);

    const matchId = nk.matchCreate('tic-tac-toe', { game_mode: gameMode });
    return matchId;
}

// RPC: save_display_name
function saveDisplayName(
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    if (!ctx.userId) throw new Error('Unauthenticated');
    const input = JSON.parse(payload);
    if (!input.displayName) throw new Error('Missing displayName');
    
    nk.accountUpdateId(ctx.userId, null, input.displayName, null, null, null, null, null);
    logger.info(`Updated display name for user ${ctx.userId} to ${input.displayName}`);
    return JSON.stringify({ success: true });
}

// RPC: get_leaderboard
function getLeaderboard(
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    // Return records from ttt-wins.
    try {
        const records = nk.leaderboardRecordsList("ttt-wins", [], 100, null);
        return JSON.stringify({ entries: records.records });
    } catch (e) {
        logger.error(`Error fetching leaderboard: ${e}`);
        return JSON.stringify({ entries: [] });
    }
}

const InitModule: nkruntime.InitModule = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    initializer: nkruntime.Initializer
) {
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

export default InitModule;
