import React from 'react';
import { GameState } from '../types';

interface MenuOverlayProps {
    gameState: GameState;
    onStart: () => void;
}

const MenuOverlay: React.FC<MenuOverlayProps> = ({ gameState, onStart }) => {
    if (gameState === GameState.PLAYING) return null;

    const isGameOver = gameState === GameState.GAME_OVER;
    const isVictory = gameState === GameState.VICTORY;
    const isMenu = gameState === GameState.MENU;

    let title = "GRAVIATOR";
    let subtitle = "";
    let buttonText = "START";
    let colorClass = "text-cyan-400";
    let containerAnimation = "";
    let titleAnimation = "";

    if (isGameOver) {
        title = "FAILURE";
        subtitle = "SIGNAL LOST";
        buttonText = "RETRY!";
        colorClass = "text-red-500";
        containerAnimation = "animate-[shake_0.5s_infinite]";
        titleAnimation = "animate-[glitch_0.3s_infinite]";
    } else if (isVictory) {
        title = "GAME CLEAR";
        subtitle = "YOU ARE THE LAST SURVIVOR!";
        buttonText = "PLAY AGAIN";
        colorClass = "text-emerald-400";
        titleAnimation = "animate-[pulse_1.5s_infinite]";
    }

    // 初回メニューは不透明、終了時は透明なオーバーレイ
    const wrapperClasses = isMenu 
        ? "bg-[#050505] z-[100] pointer-events-auto" 
        : "bg-black/5 z-50 pointer-events-none";

    return (
        <div className={`absolute inset-0 flex items-center justify-center transition-colors duration-1000 ${wrapperClasses}`}>
            
            <style>
                {`
                @keyframes glitch {
                    0% { transform: translate(0) }
                    20% { transform: translate(-2px, 2px) }
                    40% { transform: translate(-2px, -2px) }
                    60% { transform: translate(2px, 2px) }
                    80% { transform: translate(2px, -2px) }
                    100% { transform: translate(0) }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0) }
                    25% { transform: translateX(-5px) }
                    75% { transform: translateX(5px) }
                }
                `}
            </style>

            {/* Title Screen Background Decor */}
            {isMenu && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(20,20,20,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
                </div>
            )}

            {/* Game End Glow Effects (Transparent) */}
            {!isMenu && (
                <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${isGameOver ? 'bg-red-900/10' : 'bg-emerald-900/10'}`}></div>
            )}

            <div className={`
                relative z-10
                ${isMenu ? 'bg-black/60 backdrop-blur-3xl' : 'bg-black/20 backdrop-blur'}
                border 
                border-white/10 
                p-12 
                rounded-3xl 
                text-center 
                shadow-2xl 
                pointer-events-auto 
                max-w-lg 
                w-full 
                transform 
                transition-all 
                duration-500
                hover:border-white/40
                ${isMenu ? 'shadow-[0_0_100px_rgba(6,182,212,0.1)]' : 'shadow-[0_0_50px_rgba(0,0,0,0.5)]'}
                ${containerAnimation}
            `}>
                <div className="mb-8">
                    <h1 className={`text-6xl font-black tracking-tighter mb-2 ${colorClass} neon-text-shadow font-fugaz ${titleAnimation}`}>
                        {title}
                    </h1>
                    <p className={`text-white/60 font-mono tracking-[0.3em] text-sm ${isGameOver ? 'animate-pulse' : ''}`}>
                        {subtitle}
                    </p>
                </div>

                {isMenu && (
                    <div className="mb-8 text-left bg-white/5 p-6 rounded-lg border border-white/5">
                        <div className="flex items-center mb-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 mr-3 animate-pulse"></span>
                            <span className="text-s text-cyan-400 font-fugaz">MISSION</span>
                        </div>
                        <ul className="text-white/80 text-sm space-y-2 font-light font-comfortaa">
                            <li>1. <span className="text-cyan-400 font-bold">青色</span>の星を<span className="text-cyan-400 font-bold">キーボード</span>か<span className="text-cyan-400 font-bold">アナログスティック</span>で操作</li>
                            <li>2. 画面外に出たら脱落</li>
                            <li>3. <span className="text-pink-500 font-bold">最後の１人</span>まで生き残れ！</li>
                        </ul>
                    </div>
                )}

                <button
                    onClick={onStart}
                    className={`
                        group relative px-8 py-4 bg-white/5 hover:bg-white/10 
                        border border-white/20 hover:border-white/40 
                        text-white font-mono text-lg tracking-widest transition-all duration-300
                        overflow-hidden rounded-sm w-full shadow-lg
                    `}
                >
                    <span className='text-2xl z-10 group-hover:text-cyan-300 transition-colors font-fugaz'>
                        {buttonText}
                    </span>
                    <div className="absolute inset-0 bg-cyan-500/10 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"></div>
                </button>

                
                {!isMenu && (
                     <div className="mt-6 text-white/30 text-[10px] font-mono animate-pulse uppercase tracking-widest">
                        {isVictory ? 'Dominance Achieved' : 'Link Severed - System Rerouting'}
                     </div>
                )}
                

                {isMenu && (
                    <>
                        <div className="mt-8 flex justify-center space-x-8 text-xs text-white/30 font-mono">
                            <div className="flex flex-col items-center">
                                <div className="flex space-x-1">
                                    <div className="w-5 h-5 border border-white/30 rounded flex items-center justify-center">W</div>
                                    <div className="w-5 h-5 border border-white/30 rounded flex items-center justify-center">A</div>
                                    <div className="w-5 h-5 border border-white/30 rounded flex items-center justify-center">S</div>
                                    <div className="w-5 h-5 border border-white/30 rounded flex items-center justify-center">D</div>
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="flex space-x-1">
                                    <div className="w-5 h-5 border border-white/30 rounded flex items-center justify-center">↑</div>
                                    <div className="w-5 h-5 border border-white/30 rounded flex items-center justify-center">←</div>
                                    <div className="w-5 h-5 border border-white/30 rounded flex items-center justify-center">↓</div>
                                    <div className="w-5 h-5 border border-white/30 rounded flex items-center justify-center">→</div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-2 text-center text-xs text-white/30 font-mono">キーボード 又は アナログスティックで操作</div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MenuOverlay;