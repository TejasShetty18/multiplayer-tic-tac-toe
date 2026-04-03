import React from 'react';
import { useGameStore } from './store/gameStore';
import { Lobby } from './pages/Lobby';
import { Game } from './pages/Game';
import { Welcome } from './pages/Welcome';
import { Leaderboard } from './pages/Leaderboard';

const App: React.FC = () => {
  const { matchId, isConnected, showLeaderboard } = useGameStore();

  return (
    <div className="font-sans antialiased text-neutral-100 bg-black min-h-screen selection:bg-emerald-500/30">
      {!isConnected ? (
        <Welcome />
      ) : showLeaderboard ? (
        <Leaderboard />
      ) : !matchId ? (
        <Lobby />
      ) : (
        <Game />
      )}
    </div>
  );
};

export default App;
