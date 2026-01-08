import React, { useState, useEffect, useMemo } from 'react';
import { GameState, GameMode, GameStats } from '../types';
import { AudioManager } from '../game/AudioManager';
import { ItemGuide } from './ItemGuide';

interface MenuOverlayProps {
    gameState: GameState;
    onStart: (mode: GameMode) => void;
    onHome: () => void;
    onResume: () => void;
    gameStats: GameStats | null;
}

const MenuOverlay: React.FC<MenuOverlayProps> = ({ gameState, onStart, onHome, onResume, gameStats }) => {
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
    const [showItemGuide, setShowItemGuide] = useState(false);
    const audio = AudioManager.getInstance();

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

    // Reset item guide state when game state changes
    useEffect(() => {
        setShowItemGuide(false);
    }, [gameState]);

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
        subtitle = currentMode === GameMode.ENDLESS ? "" : "SIGNAL LOST";
        colorClass = currentMode === GameMode.ENDLESS ? "text-white-400" : "text-red-500 neon-text-shadow";
        blobColor = "bg-red-600";
    } else if (isVictory) {
        title = "GAME CLEAR";
        subtitle = "YOU ARE THE LAST SURVIVOR!";
        colorClass = "text-emerald-400";
        blobColor = "bg-emerald-500";
    } else if (isPaused) {
        title = "PAUSED";
        subtitle = "AWAITING INPUT";
        colorClass = "text-amber-400";
        blobColor = "bg-amber-500";
    }

    // 背景スタイルの条件分岐
    let wrapperClasses = "";
    if (isMenu) {
        wrapperClasses = "bg-[#050505] z-[100]";
    } else if (isPaused) {
        // 一時停止中はぼかしを弱く (2px)、背景色も少し薄く
        wrapperClasses = "bg-black/10 backdrop-blur-[2px] z-50";
    } else {
        // ゲームオーバー/クリア時は標準のぼかし
        wrapperClasses = "bg-black/20 backdrop-blur-sm z-50";
    }

    const handleButtonClick = async (action: () => void) => {
        // ロードを待機してから音を鳴らす
        await audio.resume();
        audio.playUiClick();
        action();
    };

    const handleHover = () => {
        audio.playUiHover();
    };

    return (
        <div className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-all duration-1000 ${wrapperClasses}`}>
            {/* Interactive Liquid Background */}
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
            `}</style>

            <div className={`relative z-10 liquid-glass p-8 md:p-12 rounded-[48px] text-center shadow-xl pointer-events-auto max-w-md w-[90%] transform transition-all duration-700 hover:border-white/20 ${isMenu ? 'translate-y-0' : 'translate-y-4'} ${showItemGuide ? 'h-[85vh] flex flex-col' : ''}`}>
                
                {showItemGuide ? (
                    <ItemGuide onClose={() => { audio.playUiClick(); setShowItemGuide(false); }} />
                ) : (
                    <>
                        <div className="mb-3 relative z-10">
                            <h1 className={`
                                text-5xl 
                                md:text-6xl 
                                font-black 
                                tracking-tight 
                                ${colorClass}  
                                font-fugaz 
                                transition-colors 
                                duration-1000
                                `}>{title}</h1>
                            <p className={`
                                text-white/40 
                                font-mono 
                                tracking-[0.4em] 
                                text-sm 
                                md:text-md 
                                uppercase 
                                mt-2
                                `}>{subtitle}</p>
                        </div>

                        {isMenu && (
                            <div className="mb-5 text-left bg-white/[0.02] p-4 rounded-3xl border border-white/5 backdrop-blur-xl relative z-10">
                                <div className="flex items-center mb-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-700 mr-3 animate-ping"></span>
                                    <span className="text-[15px] text-cyan-500 font-fugaz tracking-[0.2em] uppercase tracking-tighter">MISSION</span>
                                </div>
                                <ul className="text-white/85 text-[11px] md:text-xs space-y-1 font-comfortaa leading-relaxed">
                                    <li className="flex items-start"><span className="text-cyan-500 mr-2 font-bold opacity-70">•</span><span>画面外に出たら<span className="text-pink-500 font-bold">脱落</span>！</span></li>
                                    <li className="flex items-start"><span className="text-cyan-500 mr-2 font-bold opacity-70">•</span><span><span className="text-cyan-400 font-bold">SURVIVAL</span>: 最後の１人まで生き残れ！</span></li>
                                    <li className="flex items-start"><span className="text-cyan-500 mr-2 font-bold opacity-70">•</span><span><span className="text-pink-400 font-bold">ENDLESS</span>: 倒した敵は復活する。限界に挑め！</span></li>
                                </ul>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            {isPaused && (
                                <button onMouseEnter={handleHover} onClick={() => handleButtonClick(onResume)} className={`group relative py-2 px-10 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white font-fugaz text-lg md:text-xl tracking-[0.3em] transition-all duration-500 rounded-[24px] w-full overflow-hidden shadow-lg`}>
                                    <span className='relative z-10'>RESUME</span>
                                    <div className={`absolute inset-0 ${blobColor} opacity-0 group-hover:opacity-30 transform translate-y-full group-hover:translate-y-0 transition-all duration-700 ease-out`}></div>
                                </button>
                            )}
                            
                            {!isPaused && (
                                <>
                                    <button onMouseEnter={handleHover} onClick={() => handleButtonClick(() => onStart(GameMode.SURVIVAL))} className={`group relative py-2 px-10 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white font-fugaz text-lg md:text-xl tracking-[0.3em] transition-all duration-500 rounded-[24px] w-full overflow-hidden shadow-lg`}>
                                        <span className='relative z-10'>SURVIVAL</span>
                                        <div className={`absolute inset-0 ${blobColor} opacity-0 group-hover:opacity-30 transform translate-y-full group-hover:translate-y-0 transition-all duration-700 ease-out`}></div>
                                    </button>
                                    <button onMouseEnter={handleHover} onClick={() => handleButtonClick(() => onStart(GameMode.ENDLESS))} className={`group relative py-2 px-10 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white font-fugaz text-lg md:text-xl tracking-[0.3em] transition-all duration-500 rounded-[24px] w-full overflow-hidden shadow-lg`}>
                                        <span className='relative z-10'>ENDLESS</span>
                                        <div className={`absolute inset-0 ${blobColor} opacity-0 group-hover:opacity-30 transform translate-y-full group-hover:translate-y-0 transition-all duration-700 ease-out`}></div>
                                    </button>
                                </>
                            )}
                            
                            {/* Item Guide Button */}
                            {isMenu && (
                                <button onMouseEnter={handleHover} onClick={() => handleButtonClick(() => setShowItemGuide(true))} className={`group relative py-3 px-10 bg-transparent hover:bg-white/5 border border-white/5 hover:border-white/20 text-white/60 hover:text-white font-fugaz text-sm md:text-md tracking-[0.4em] transition-all duration-500 rounded-[20px] w-full overflow-hidden`}>
                                    <span className='relative z-10 tracking-wider'>ITEM GUIDE</span>
                                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                </button>
                            )}

                            {!isMenu && (
                                <button onMouseEnter={handleHover} onClick={() => handleButtonClick(onHome)} className={`group relative py-3 px-10 bg-transparent hover:bg-white/5 border border-white/5 hover:border-white/20 text-white/60 hover:text-white font-fugaz text-sm md:text-md tracking-[0.4em] transition-all duration-500 rounded-[20px] w-full overflow-hidden`}>
                                    <span className='relative z-10 tracking-wider'>HOME</span>
                                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MenuOverlay;