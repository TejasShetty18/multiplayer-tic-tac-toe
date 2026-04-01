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

        let deviceId = localStorage.getItem('nakama_device_id');
        if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem('nakama_device_id', deviceId);
        }

        try {
            const session = await this.client.authenticateDevice(deviceId, true, username);
            this.session = session;
            localStorage.setItem('nakama_token', session.token);
            
            // Connect socket
            await this.socket.connect(session, true);
            useGameStore.getState().setSession(session.user_id || '', session.username || '');
            
            return session;
        } catch (error) {
            console.error("Authentication failed:", error);
            throw error;
        }
    }

    async findMatch(displayName: string, gameMode: 'classic' | 'timer' = 'classic') {
        if (!this.session) throw new Error("Not authenticated");

        const query = `+properties.game_mode:${gameMode}`;
        const ticket = await this.socket.addMatchmaker(
            query,
            2,
            2,
            { display_name: displayName, game_mode: gameMode },
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

    async sendMove(matchId: string, position: number) {
        await this.socket.sendMatchState(matchId, 1, new TextEncoder().encode(JSON.stringify({ position })));
    }
}

export const nakamaClient = new NakamaService();
