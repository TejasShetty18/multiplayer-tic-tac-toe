declare namespace nkruntime {
    export interface Context {
        userId?: string;
    }
    export interface Logger {
        info(message: string): void;
        error(message: string): void;
    }
    export interface Nakama {
        matchCreate(module: string, params: {[key: string]: any}): string;
        binaryToString(data: Uint8Array): string;
        stringToBinary(str: string): Uint8Array;
        accountUpdateId(userId: string, username: string | null, displayName: string | null, timezone: string | null, location: string | null, langTag: string | null, avatarUrl: string | null, metadata: {[key: string]: any} | null): void;
        leaderboardRecordsList(id: string, ownerIds: string[], limit: number, cursor: string | null): any;
        leaderboardRecordWrite(id: string, ownerId: string, username: string | null, score: number, subscore: number, metadata: {[key: string]: any} | null, overrideOperator?: number): any;
    }
    export interface Initializer {
        registerMatch(name: string, matchProvider: any): void;
        registerMatchmakerMatched(fn: (ctx: Context, logger: Logger, nk: Nakama, matches: MatchmakerResult[]) => string): void;
        registerRpc(id: string, fn: (ctx: Context, logger: Logger, nk: Nakama, payload: string) => string): void;
    }
    export interface Presence {
        userId: string;
        sessionId: string;
        username: string;
    }
    export interface MatchState {}
    export interface MatchDispatcher {
        broadcastMessage(opCode: number, data?: string, presences?: Presence[], sender?: Presence): void;
    }
    export interface MatchMessage {
        opCode: number;
        data: Uint8Array;
        sender: Presence;
    }
    export interface MatchmakerResult {
        match_id: string;
        presences: Array<{
            presence: Presence;
            string_properties: { [key: string]: string };
            numeric_properties: { [key: string]: number };
        }>;
        string_properties?: { [key: string]: string };
        numeric_properties?: { [key: string]: number };
    }
    export type InitModule = (ctx: Context, logger: Logger, nk: Nakama, initializer: Initializer) => void;
}
