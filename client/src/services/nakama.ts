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
        if (this.session) return this.session;

        // Key insight: if the submitted name differs from the stored name,
        // the person sitting at this browser has changed → fresh identity.
        const storedName = localStorage.getItem('nakama_display_name');
        let deviceId = localStorage.getItem('nakama_device_id');

        if (!deviceId || storedName !== username) {
            // New person or first visit — create a brand-new user account.
            deviceId = crypto.randomUUID();
            localStorage.setItem('nakama_device_id', deviceId);
            localStorage.removeItem('nakama_token');
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

        const ticket = await this.socket.addMatchmaker(
            '*',
            2,
            2,
            { display_name: displayName, game_mode: gameMode || 'classic' },
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
            const payload = result.payload as any;
            return payload?.entries || [];
        } catch (e) {
            console.error('Failed to fetch leaderboard:', e);
            return [];
        }
    }
}

export const nakamaClient = new NakamaService();
