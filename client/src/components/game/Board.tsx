import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Cell } from './Cell';
import { nakamaClient } from '../../services/nakama';

interface BoardProps {
    matchId: string;
    isMyTurn: boolean;
    myMark: 'X' | 'O' | undefined;
}

export const Board: React.FC<BoardProps> = ({ matchId, isMyTurn, myMark }) => {
    const { board, state } = useGameStore();
    const isGameOver = state === 'finished';

    const handleCellClick = async (index: number) => {
        if (!isMyTurn || isGameOver || board[index]) return;
        
        try {
            await nakamaClient.sendMove(matchId, index);
        } catch (error) {
            console.error("Failed to make move", error);
        }
    };

    return (
        <div className="grid grid-cols-3 gap-3 md:gap-4 lg:gap-5 w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto bg-neutral-800 p-4 md:p-6 rounded-2xl shadow-blue-900 shadow-2xl">
            {board.map((mark, idx) => (
                <Cell 
                    key={idx}
                    index={idx}
                    mark={mark}
                    onClick={() => handleCellClick(idx)}
                    isInteractive={isMyTurn && !isGameOver && !mark}
                    myMark={myMark}
                />
            ))}
        </div>
    );
};
