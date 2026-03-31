import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CellProps {
    index: number;
    mark: string | null;
    onClick: () => void;
    isInteractive: boolean;
    myMark?: string;
}

export const Cell: React.FC<CellProps> = ({ mark, onClick, isInteractive, myMark }) => {
    
    return (
        <button
            onClick={onClick}
            disabled={!isInteractive}
            className={cn(
                "relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl flex items-center justify-center border transition-all duration-300 overflow-hidden group",
                !mark ? "border-neutral-700 bg-neutral-900 shadow-inner" : "",
                mark === 'X' ? "border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "",
                mark === 'O' ? "border-rose-500/50 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]" : "",
                isInteractive && !mark ? "hover:border-neutral-500 hover:bg-neutral-800 cursor-pointer" : "cursor-default",
                !isInteractive && !mark ? "opacity-60" : ""
            )}
        >
            {/* Hover preview if empty and interactive */}
            {isInteractive && !mark && myMark && (
                 <span className={cn(
                     "absolute inset-0 flex items-center justify-center text-4xl sm:text-6xl md:text-7xl font-mono font-bold opacity-0 group-hover:opacity-20 transition-opacity duration-300",
                     myMark === 'X' ? "text-emerald-400" : "text-rose-400"
                 )}>
                     {myMark}
                 </span>
            )}
            
            {mark && (
                <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={cn(
                        "text-5xl sm:text-6xl md:text-7xl font-mono font-black drop-shadow-lg",
                        mark === 'X' ? "text-emerald-400" : "text-rose-400"
                    )}
                >
                    {mark}
                </motion.span>
            )}
        </button>
    );
};
