import { matchInit, matchJoinAttempt, matchJoin, matchLeave, matchLoop, matchTerminate, matchSignal } from './match';

const InitModule: nkruntime.InitModule = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    initializer: nkruntime.Initializer
) {
    logger.info('Initializing Tic-Tac-Toe Server Modules');

    // Register Authoritative Match
    initializer.registerMatch('tic-tac-toe', {
        matchInit,
        matchJoinAttempt,
        matchJoin,
        matchLeave,
        matchLoop,
        matchTerminate,
        matchSignal
    });

    // Hook Matchmaker completion
    // When 2 players find each other, automatically create the match and return the ID.
    initializer.registerMatchmakerMatched(function (
        ctx: nkruntime.Context,
        logger: nkruntime.Logger,
        nk: nkruntime.Nakama,
        matches: nkruntime.MatchmakerResult[]
    ): string {
        logger.info('Matchmaking completed, spawning authoritative match...');
        const matchId = nk.matchCreate('tic-tac-toe', {});
        return matchId; // This tells the clients which match they should join.
    });

    logger.info('Tic-Tac-Toe Server Modules Initialized');
};

export default InitModule;
