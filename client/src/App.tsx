import React from 'react';
import { useGameStore } from './store/gameStore';
import { Lobby } from './pages/Lobby';
import { Game } from './pages/Game';

const App: React.FC = () => {
  const { matchId } = useGameStore();

  return (
    <div className="font-sans antialiased text-neutral-100 bg-black min-h-screen selection:bg-emerald-500/30">
      {!matchId ? <Lobby /> : <Game />}
    </div>
  );
};

export default App;
