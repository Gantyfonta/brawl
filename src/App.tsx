import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, User, Sword, Heart, Zap } from 'lucide-react';
import ShowdownGame from './components/ShowdownGame';
import { BRAWLERS, BrawlerType, BrawlerConfig } from './types/game';

const BRAWLER_LIST = Object.values(BRAWLERS);

export default function App() {
  const [gameState, setGameState] = useState<'MENU' | 'SELECT' | 'GAME' | 'GAMEOVER'>('MENU');
  const [selectedBrawler, setSelectedBrawler] = useState<BrawlerConfig>(BRAWLERS.shelly);
  const [gameResult, setGameResult] = useState<{ rank: number; cubes: number } | null>(null);

  const handleStartGame = () => {
    setGameState('GAME');
  };

  const handleGameOver = (rank: number, cubes: number) => {
    setGameResult({ rank, cubes });
    setGameState('GAMEOVER');
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        {gameState === 'MENU' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center"
          >
            <h1 className="text-6xl md:text-8xl brawl-font italic font-black text-yellow-400 mb-8 drop-shadow-[0_5px_0_rgba(0,0,0,0.5)]">
              MINI BRAWL
            </h1>
            
            <div className="relative group cursor-pointer mb-8" onClick={() => setGameState('SELECT')}>
              <div className="bg-slate-800 rounded-3xl p-6 border-4 border-slate-700 hover:border-yellow-400 transition-colors">
                <div className="text-4xl mb-2">{selectedBrawler.emoji}</div>
                <div className="text-xl font-bold uppercase">{selectedBrawler.name}</div>
                <div className="flex gap-2 justify-center mt-2 opacity-60">
                   <User size={16} /> <span className="text-xs uppercase">Tap to change</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="bg-yellow-400 hover:bg-yellow-300 transform hover:scale-110 active:scale-95 transition-all text-slate-900 px-12 py-4 rounded-full text-3xl brawl-font italic font-black flex items-center gap-4 shadow-[0_6px_0_rgba(180,130,0,1)]"
            >
              <Play fill="currentColor" size={32} />
              PLAY
            </button>
          </motion.div>
        )}

        {gameState === 'SELECT' && (
          <motion.div
            key="select"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-full max-w-4xl px-4"
          >
            <h2 className="text-4xl brawl-font italic text-white mb-8 text-center">Select Brawler</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {BRAWLER_LIST.map((b) => (
                <div
                  key={b.type}
                  onClick={() => {
                    setSelectedBrawler(b);
                    setGameState('MENU');
                  }}
                  className={`cursor-pointer rounded-3xl p-6 border-4 transition-all hover:scale-105 ${
                    selectedBrawler.type === b.type 
                    ? 'bg-yellow-400/20 border-yellow-400 shadow-lg shadow-yellow-400/20' 
                    : 'bg-slate-800/50 border-slate-700 border-dashed'
                  }`}
                >
                  <div className="text-7xl mb-4 text-center">{b.emoji}</div>
                  <h3 className="text-2xl font-bold text-center mb-4">{b.name}</h3>
                  <div className="space-y-2 text-sm uppercase">
                    <div className="flex justify-between items-center bg-black/30 p-2 rounded-lg">
                      <span className="flex items-center gap-1"><Heart size={14} className="text-green-400" /> HP</span>
                      <span className="font-bold">{b.hp}</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/30 p-2 rounded-lg">
                      <span className="flex items-center gap-1"><Sword size={14} className="text-red-400" /> DMG</span>
                      <span className="font-bold">{b.damage}</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/30 p-2 rounded-lg">
                      <span className="flex items-center gap-1"><Zap size={14} className="text-blue-400" /> SPEED</span>
                      <span className="font-bold">{b.speed}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setGameState('MENU')}
              className="mt-12 text-slate-400 hover:text-white uppercase font-bold flex items-center justify-center w-full"
            >
              Back to Menu
            </button>
          </motion.div>
        )}

        {gameState === 'GAME' && (
          <ShowdownGame 
            playerBrawler={selectedBrawler} 
            onGameOver={handleGameOver} 
          />
        )}

        {gameState === 'GAMEOVER' && gameResult && (
          <motion.div
            key="gameover"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className={`text-8xl brawl-font italic font-black mb-4 ${gameResult.rank === 1 ? 'text-yellow-400' : 'text-slate-400'}`}>
              #{gameResult.rank}
            </div>
            <div className="text-2xl uppercase mb-8 opacity-60">
              {gameResult.rank === 1 ? 'Rank 1 / Showdown Victory!' : `Rank ${gameResult.rank} / Defeated`}
            </div>
            <div className="bg-slate-800 rounded-3xl p-6 mb-8 border-4 border-slate-700">
               <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-12">
                    <span className="flex items-center gap-2 text-yellow-400 font-bold uppercase"><Zap size={24} /> Power Cubes</span>
                    <span className="text-3xl font-black">{gameResult.cubes}</span>
                  </div>
               </div>
            </div>
            <button
              onClick={() => setGameState('MENU')}
              className="bg-slate-100 hover:bg-white text-slate-900 px-12 py-4 rounded-full text-2xl brawl-font italic font-black"
            >
              CONTINUE
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
