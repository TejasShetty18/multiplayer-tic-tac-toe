import { Client, Session, type Socket, type MatchData } from '@heroiclabs/nakama-js';
import { useGameStore } from '../store/gameStore';

class NakamaService {
    private client: Client;
    private session: Session | null = null;
    private socket: Socket;
    private useSSL = false;

    constructor() {
        this.client = new Client('defaultkey', 'localhost', '7350', this.useSSL);
        this.socket = this.client.createSocket(this.useSSL, false);

        // Setup socket listeners
        this.socket.onmatchdata = (matchData: MatchData) => {
            useGameStore.getState().handleMatchData(matchData);
        };

        this.socket.ondisconnect = () => {
            useGameStore.getState().handleDisconnect();
        };
    }

    async authenticate(username: string) {
        const storedName = localStorage.getItem('nakama_display_name');
        
        // If we already have a session in memory AND the username hasn't changed, return it early.
        if (this.session && storedName === username) {
            return this.session;
        }

        let deviceId = localStorage.getItem('nakama_device_id');

        if (!deviceId || storedName !== username) {
            // New person or first visit — create a brand-new user account.
            deviceId = crypto.randomUUID();
            localStorage.setItem('nakama_device_id', deviceId);
            localStorage.removeItem('nakama_token');
            this.session = null;
        }
        // Persist the chosen name so we can detect changes next time.
        localStorage.setItem('nakama_display_name', username);

        try {
            const session = await this.client.authenticateDevice(deviceId, true, username);
            this.session = session;
            localStorage.setItem('nakama_token', session.token);
            await this.socket.connect(session, true);
            useGameStore.getState().setSession(session.user_id || '', session.username || '');
            return session;
        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    }

    async findMatch(displayName: string, gameMode?: string) {
        if (!this.session) throw new Error("Not authenticated");

        const mode = gameMode || 'classic';
        const ticket = await this.socket.addMatchmaker(
            `+properties.game_mode:${mode}`,
            2,
            2,
            { display_name: displayName, game_mode: mode },
            {}
        );
        return ticket.ticket;
    }

    onMatchmakerMatched(callback: (matched: any) => void) {
        this.socket.onmatchmakermatched = callback;
    }

    async joinMatch(matchId: string) {
        const match = await this.socket.joinMatch(matchId);
        useGameStore.getState().setMatch(match.match_id);
        return match;
    }

    async leaveMatch(matchId: string) {
        try {
            await this.socket.leaveMatch(matchId);
        } catch (e) {
            console.error('Failed to leave match:', e);
        }
    }

    async sendMove(matchId: string, position: number) {
        await this.socket.sendMatchState(matchId, 1, new TextEncoder().encode(JSON.stringify({ position })));
    }

    async saveDisplayName(displayName: string) {
        if (!this.session) return;
        try {
            await this.client.rpc(this.session, 'save_display_name', { displayName });
        } catch (e) {
            console.warn('Failed to save display name:', e);
        }
    }

    async getLeaderboard(): Promise<any[]> {
        if (!this.session) return [];
        try {
            const result = await this.client.rpc(this.session, 'get_leaderboard', {});
            // result.payload may be returned as a JSON string from the Goja runtime depending on Nakama-JS version
            const parsed = typeof result.payload === 'string' ? JSON.parse(result.payload) : (result.payload || { entries: [] });
            const entries = parsed.entries || [];

            // Map Nakama's raw leaderboard format to our frontend LeaderboardEntry interface
            return entries.map((entry: any) => ({
                rank: entry.rank || 0,
                userId: entry.ownerId,
                displayName: entry.username || 'Player',
                wins: entry.score || 0,
                losses: entry.metadata?.losses || 0,
                draws: entry.metadata?.draws || 0,
                bestStreak: entry.metadata?.bestStreak || 0,
                currentStreak: entry.metadata?.currentStreak || 0
            }));
        } catch (e) {
            console.error('Failed to fetch leaderboard:', e);
            return [];
        }
    }
}

export const nakamaClient = new NakamaService();
