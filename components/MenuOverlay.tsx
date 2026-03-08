import React, { useState, useEffect } from 'react';
import { GameState, GameMode, GameStats, Difficulty } from '../types';
import { ItemGuide } from './ItemGuide';
import { Leaderboard } from './Leaderboard';
import { SettingsModal } from './SettingsModal';
import { signInWithGoogle, signOut } from '../lib/supabase';
import { TIPS_DATA } from '../constants/tips';

interface MenuOverlayProps {
    gameState: GameState;
    onStart: (mode: GameMode, difficulty: Difficulty) => void;
    onHome: () => void;
    onResume: () => void;
    gameStats: GameStats | null;
    selectedDifficulty: Difficulty;
    setSelectedDifficulty: (diff: Difficulty) => void;
    showItemGuide: boolean;
    setShowItemGuide: (show: boolean) => void;
    showLeaderboard: boolean;
    setShowLeaderboard: (show: boolean) => void;
    showSettings?: boolean;
    setShowSettings?: (show: boolean) => void;
    userName?: string;
    setUserName?: (name: string) => void;
    userId?: string | null;
    dbStatus?: 'checking' | 'connected' | 'error' | 'offline';
}

const MenuOverlay: React.FC<MenuOverlayProps> = ({ 
    gameState, 
    onStart, 
    onHome, 
    onResume, 
    gameStats,
    selectedDifficulty,
    setSelectedDifficulty,
    showItemGuide,
    setShowItemGuide,
    showLeaderboard,
    setShowLeaderboard,
    showSettings = false,
    setShowSettings,
    userName = 'Player',
    setUserName,
    userId,
    dbStatus
}) => {
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

    // 背景アニメーション用のマウス位置追跡
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        if (gameStats?.difficulty && gameState !== GameState.PLAYING && gameState !== GameState.MENU) {
            setSelectedDifficulty(gameStats.difficulty);
        }
    }, [gameStats, gameState, setSelectedDifficulty]);

    // tips表示
    const [tips_sentence, setTipsSentence] = useState('');
    useEffect(() => {
        if (gameState !== GameState.PLAYING) {
            const randomIndex = Math.floor(Math.random() * TIPS_DATA.length);
            setTipsSentence(TIPS_DATA[randomIndex]);
        }
    }, [gameState])

    if (gameState === GameState.PLAYING) return null;

    const isGameOver = gameState === GameState.GAME_OVER;
    const isVictory = gameState === GameState.VICTORY;
    const isPaused = gameState === GameState.PAUSED;
    const isMenu = gameState === GameState.MENU;
    const currentMode = gameStats?.mode || GameMode.SURVIVAL;

    let title = "GRAVIATOR*";
    let subtitle = "";
    let colorClass = "text-cyan-400";
    let blobColor = "bg-cyan-500";

    if (isGameOver) {
        title = currentMode === GameMode.ENDLESS ? `${gameStats?.kills || 0} KILLS` : "FAILURE";
        subtitle = "SIGNAL LOST";
        colorClass = "text-white-500";
        blobColor = "bg-white-600";
    } else if (isVictory) {
        title = "GAME CLEAR";
        subtitle = "";
        colorClass = "text-emerald-400";
        blobColor = "bg-emerald-500";
    } else if (isPaused) {
        title = "PAUSED";
        subtitle = "AWAITING INPUT";
        colorClass = "text-amber-400";
        blobColor = "bg-amber-500";
    }

    const renderDifficultyButton = (diff: Difficulty) => {
        const isSelected = selectedDifficulty === diff;
        let baseColorClass = "";
        let activeBgClass = "";
        let blobBgClass = "";

        if (diff === Difficulty.EASY) {
            baseColorClass = isSelected ? "text-emerald-400 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "text-white/60 border-white/10 hover:text-emerald-400";
            activeBgClass = isSelected ? "bg-emerald-500/20" : "bg-white/5 hover:bg-white/20";
            blobBgClass = "bg-emerald-500";
        } else if (diff === Difficulty.NORMAL) {
            baseColorClass = isSelected ? "text-cyan-400 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]" : "text-white/60 border-white/10 hover:text-cyan-400";
            activeBgClass = isSelected ? "bg-cyan-500/20" : "bg-white/5 hover:bg-white/20";
            blobBgClass = "bg-cyan-500";
        } else if (diff === Difficulty.HARD) {
            baseColorClass = isSelected ? "text-red-400 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" : "text-white/60 border-white/10 hover:text-red-400";
            activeBgClass = isSelected ? "bg-red-500/20" : "bg-white/5 hover:bg-white/20";
            blobBgClass = "bg-red-600";
        } else if (diff === Difficulty.EXTREME) {
            baseColorClass = isSelected ? "text-purple-400 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]" : "text-white/60 border-white/10 hover:text-purple-400";
            activeBgClass = isSelected ? "bg-purple-500/20" : "bg-white/5 hover:bg-white/20";
            blobBgClass = "bg-purple-600";
        }

        return (
            <button 
                onClick={() => setSelectedDifficulty(diff)} 
                className={`group relative flex-1 py-1 px-2 rounded-xl text-[10px] md:text-xs font-bold font-orbitron tracking-widest transition-all duration-300 overflow-hidden border-2 ${baseColorClass} ${activeBgClass}`}
            >
                <span className='relative z-10'>{diff}</span>
                <div className={`absolute inset-0 ${blobBgClass} opacity-0 group-hover:opacity-20 transform translate-y-full group-hover:translate-y-0 transition-all duration-500 ease-out`}></div>
            </button>
        );
    };

    return (
        <div className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-all duration-1000 ${isMenu ? 'bg-[#050505]' : 'bg-black/20 backdrop-blur-sm'} z-[100]`}>
            {/* DBステータス表示 (ホーム画面右上) */}
            {isMenu && dbStatus && (
                <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl z-[110]">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                        dbStatus === 'connected' ? 'bg-green-500' : 
                        dbStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
                    } ${dbStatus === 'checking' ? 'animate-pulse' : ''}`} />
                    <span className="text-[10px] font-orbitron font-bold text-white/40 tracking-[0.1em] uppercase">
                        DB: {dbStatus}
                    </span>
                </div>
            )}

            {/* インタラクティブ背景（液体のblobアニメーション） */}
            <div className="absolute inset-0 pointer-events-none opacity-30 select-none">
                <div 
                    className={`absolute w-[600px] h-[600px] rounded-full mix-blend-screen filter blur-[100px] animate-[liquid_25s_infinite] ${blobColor}`}
                    style={{ left: `${mousePos.x * 100 - 30}%`, top: `${mousePos.y * 100 - 30}%`, transition: 'left 1s cubic-bezier(0.2, 0, 0.2, 1), top 1s cubic-bezier(0.2, 0, 0.2, 1)' }}
                />
                <div 
                    className={`absolute w-[450px] h-[450px] rounded-full mix-blend-screen filter blur-[80px] animate-[liquid_18s_infinite_reverse] ${isGameOver ? 'bg-orange-600' : 'bg-blue-600'}`}
                    style={{ right: `${(1 - mousePos.x) * 100 - 20}%`, bottom: `${(1 - mousePos.y) * 100 - 20}%`, transition: 'right 1.5s cubic-bezier(0.2, 0, 0.2, 1), bottom 1.5s cubic-bezier(0.2, 0, 0.2, 1)' }}
                />
            </div>

            <style>{`
                @keyframes liquid {
                    0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: translate(0, 0) scale(1) rotate(0deg); }
                    33% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; transform: translate(40px, -40px) scale(1.1) rotate(120deg); }
                    66% { border-radius: 50% 40% 70% 40% / 40% 50% 30% 60%; transform: translate(-40px, 40px) scale(0.9) rotate(240deg); }
                }
                .liquid-glass { background: rgba(255, 255, 255, 0.04); backdrop-filter: blur(50px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 10px 40px 0 rgba(0, 0, 0, 0.7); position: relative; overflow: hidden; }
                .menu-scroll-container::-webkit-scrollbar { width: 4px; }
                .menu-scroll-container::-webkit-scrollbar-track { background: transparent; }
                .menu-scroll-container::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
            `}</style>

            <div className={`relative z-10 liquid-glass p-5 md:p-10 rounded-[32px] md:rounded-[48px] text-center shadow-2xl pointer-events-auto max-w-xl w-[95%] max-h-[92vh] flex flex-col transform transition-all duration-700`}>
                <div className="overflow-y-auto menu-scroll-container flex-1 w-full px-2">
                    {showItemGuide ? (
                        <ItemGuide onClose={() => setShowItemGuide(false)} />
                    ) : showLeaderboard ? (
                        <Leaderboard 
                            onClose={() => setShowLeaderboard(false)} 
                            currentMode={gameStats?.mode}
                            currentDifficulty={selectedDifficulty}
                        />
                    ) : showSettings && setShowSettings && setUserName ? (
                        <SettingsModal 
                            onClose={() => setShowSettings(false)}
                            userName={userName}
                            setUserName={setUserName}
                        />
                    ) : (
                        <>
                            <div className="mt-7 landscape:mt-0 md:mt-0 mb-6 md:mb-6 relative z-10">
                                <h1 className={`text-4xl landscape:text-5xl md:text-6xl font-black tracking-tight ${colorClass} font-orbitron transition-colors duration-1000`}>{title}</h1>
                                {gameStats && !isMenu && (
                                    <div className="mt-1">
                                        <span className="inline-block py-0.5 px-3 rounded-full text-[10px] md:text-[12px] font-orbitron font-bold tracking-[0.2em] bg-white/5 text-white/70">
                                            {gameStats.difficulty} MODE
                                        </span>
                                    </div>
                                )}
                                <p className="text-white/40 font-rajdhani tracking-[0.3em] text-[10px] md:text-sm uppercase mt-1 md:mt-2">{subtitle}</p>
                                {isVictory && currentMode === GameMode.SURVIVAL && gameStats && (
                                    <div className="mt-2 md:mt-4">
                                        <p className="text-emerald-400/80 font-orbitron text-[10px] md:text-xs tracking-[0.2em] uppercase">CLEAR TIME</p>
                                        <p className="text-white font-orbitron text-2xl md:text-4xl font-bold tracking-widest" style={{ textShadow: '0 0 20px rgba(52, 211, 153, 0.6)' }}>
                                            {gameStats.timeSurvived.toFixed(2)}<span className="text-sm md:text-lg ml-1 text-emerald-400">s</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {isMenu && (
                                <div className="mb-4 md:mb-6 text-left bg-white/[0.02] p-3 md:p-4 rounded-2xl md:rounded-3xl border border-white/5 backdrop-blur-xl relative z-10">
                                    <div className="flex items-center mb-1 md:mb-2">
                                        <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-cyan-500 mr-2 md:mr-3 animate-pulse"></span>
                                        <span className="text-[11px] md:text-[13px] text-cyan-500 font-orbitron font-bold tracking-[0.2em] uppercase">MISSION PROFILE</span>
                                    </div>
                                    <ul className="text-white/85 text-[10px] md:text-xs space-y-0.5 md:space-y-1 font-rajdhani font-semibold leading-relaxed pl-3 md:pl-4">
                                        <li><span className="text-cyan-500 mr-1 md:mr-2">•</span>画面外に出たら<span className="text-pink-500 font-bold text-[12px] ">脱落</span>！</li>
                                        <li><span className="text-cyan-500 mr-1 md:mr-2">•</span><span className="text-cyan-400 text-[14px]">SURVIVAL </span>: 最後の1人まで生き残れ！</li>
                                        <li><span className="text-cyan-500 mr-1 md:mr-2">•</span><span className="text-pink-400 text-[14px]">ENDLESS </span>: 敵の数は無限大。限界に挑め！</li>
                                    </ul>
                                </div>
                            )}

                            <div className="flex flex-col gap-2 w-full max-w-sm mx-auto">
                                {isPaused ? (
                                    <button onClick={onResume} className="group relative py-2 md:py-3 px-8 md:px-10 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white font-orbitron font-black text-lg md:text-xl tracking-[0.3em] transition-all duration-500 rounded-[20px] md:rounded-[24px] overflow-hidden shadow-lg">
                                        <span className='relative z-10'>RESUME</span>
                                        <div className={`absolute inset-0 ${blobColor} opacity-0 group-hover:opacity-30 transform translate-y-full group-hover:translate-y-0 transition-all duration-700 ease-out`}></div>
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => onStart(GameMode.SURVIVAL, selectedDifficulty)} className="flex-1 group relative py-3 md:py-3 px-2 bg-white/5 hover:bg-white/10 border-2 border-white/20 hover:border-cyan-400 text-white hover:text-cyan-400 font-orbitron font-black text-xs md:text-lg tracking-[0.1em] md:tracking-[0.2em] transition-all duration-500 rounded-[20px] md:rounded-[24px] overflow-hidden shadow-lg">
                                            <span className='relative z-10'>SURVIVAL</span>
                                            <div className={`absolute inset-0 ${blobColor} opacity-0 group-hover:opacity-30 transform translate-y-full group-hover:translate-y-0 transition-all duration-700 ease-out`}></div>
                                        </button>
                                        <button onClick={() => onStart(GameMode.ENDLESS, selectedDifficulty)} className="flex-1 group relative py-3 md:py-3 px-2 bg-white/5 hover:bg-white/10 border-2 border-white/20 hover:border-pink-400 text-white hover:text-pink-400 font-orbitron font-black text-xs md:text-lg tracking-[0.1em] md:tracking-[0.2em] transition-all duration-500 rounded-[20px] md:rounded-[24px] overflow-hidden shadow-lg">
                                            <span className='relative z-10'>ENDLESS</span>
                                            <div className={`absolute inset-0 ${blobColor} opacity-0 group-hover:opacity-30 transform translate-y-full group-hover:translate-y-0 transition-all duration-700 ease-out`}></div>
                                        </button>
                                    </div>
                                )}

                                {!isPaused && (
                                    <div className="flex gap-1 w-full mt-0.5 md:mt-1">
                                        {renderDifficultyButton(Difficulty.EASY)}
                                        {renderDifficultyButton(Difficulty.NORMAL)}
                                        {renderDifficultyButton(Difficulty.HARD)}
                                        {renderDifficultyButton(Difficulty.EXTREME)}
                                    </div>
                                )}

                                {isMenu && (
                                    <div className="flex gap-2 w-full mt-0.5 md:mt-1">
                                        <button onClick={() => onStart(GameMode.TUTORIAL, Difficulty.EASY)} className="flex-1 py-2 md:py-2 text-white hover:text-white font-orbitron font-bold text-[9px] md:text-[10px] tracking-widest uppercase transition-all bg-white/5 hover:bg-white/20 rounded-xl md:rounded-2xl border border-white/5 hover:border-white/20">
                                            TUTORIAL
                                        </button>
                                        <button onClick={() => setShowItemGuide(true)} className="flex-1 py-2 md:py-2 text-white hover:text-white font-orbitron font-bold text-[9px] md:text-[10px] tracking-widest uppercase transition-all bg-white/5 hover:bg-white/20 rounded-xl md:rounded-2xl border border-white/5 hover:border-white/20">
                                            ITEM GUIDE
                                        </button>
                                    </div>
                                )}

                                {isMenu && (
                                    <div className="flex gap-2 w-full mt-0.5 md:mt-1">
                                        <button onClick={() => setShowLeaderboard(true)} className="flex-1 px-20 py-2 text-white hover:text-cyan-400 font-orbitron font-bold text-[9px] md:text-[10px] tracking-widest uppercase transition-all bg-white/5 hover:bg-white/20 rounded-xl md:rounded-2xl border border-white/5 hover:border-cyan-500/30">
                                            RANKING
                                        </button>

                                        <button 
                                            onClick={signInWithGoogle} 
                                            className="flex-1 py-2 text-white/80 hover:text-white font-orbitron font-bold text-[9px] md:text-[10px] tracking-widest uppercase transition-all bg-blue-600/30 rounded-xl md:rounded-2xl border border-blue-500/50 hover:bg-blue-600/50"
                                        >
                                            LOGIN
                                        </button>

                                        {/* 設定ボタン（歯車アイコン） */}
                                        <button 
                                            onClick={() => setShowSettings && setShowSettings(true)}
                                            className="px-3 py-2 text-white/80 hover:text-white transition-all bg-white/5 hover:bg-white/20 rounded-xl md:rounded-2xl border border-white/5 hover:border-white/30 flex items-center justify-center"
                                            title="Settings"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                                {/* ★追加ここまで */}

                                {!isMenu && (
                                    <div className="flex gap-2 mt-2 md:mt-4">
                                         <button onClick={onHome} className="flex-1 py-1 md:py-2 text-white/60 hover:text-white/80 font-orbitron font-bold text-[9px] md:text-[10px] tracking-[0.3em] transition-all">
                                            HOME
                                        </button>
                                        <button onClick={() => setShowLeaderboard(true)} className="flex-1 py-1 md:py-2 text-white/60 hover:text-white/80 font-orbitron font-bold text-[9px] md:text-[10px] tracking-[0.2em] transition-all">
                                            RANKING
                                        </button>
                                    </div>
                                )}

                                <div className="flex gap-2 mt-2 mx-auto text-center text-white/80 hover:text-white font-orbitron font-light text-[9px] md:text-[9px]">
                                    ヒント： {tips_sentence}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MenuOverlay;
