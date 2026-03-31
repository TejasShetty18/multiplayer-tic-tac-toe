declare namespace nkruntime {
    export interface Context {}
    export interface Logger {
        info(message: string): void;
        error(message: string): void;
    }
    export interface Nakama {
        matchCreate(module: string, params: {[key: string]: any}): string;
        binaryToString(data: Uint8Array): string;
        stringToBinary(str: string): Uint8Array;
    }
    export interface Initializer {
        registerMatch(name: string, matchProvider: any): void;
        registerMatchmakerMatched(fn: (ctx: Context, logger: Logger, nk: Nakama, matches: MatchmakerResult[]) => string): void;
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
    }
    export type InitModule = (ctx: Context, logger: Logger, nk: Nakama, initializer: Initializer) => void;
}
