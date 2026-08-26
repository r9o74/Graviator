import React from 'react';
import { GameStats, GameMode, Difficulty } from '../types';

interface InfoPanelProps {
    stats: GameStats | null;
}

// ゲーム中のステータス表示パネル
const InfoPanel: React.FC<InfoPanelProps> = ({ stats }) => {
    const mode = stats?.mode || GameMode.SURVIVAL;
    const speed = stats?.speed || 0;
    const maxSpeed = stats?.maxSpeed || 0;
    const gravity = stats?.gravityForce || 0;
    const maxGravity = stats?.maxGravity || 0;
    const currentEnemies = stats?.currentEnemies || 0;
    const initialEnemies = stats?.initialEnemies || 10;
    const time = stats?.timeSurvived || 0;
    const kills = stats?.kills || 0;
    const difficulty = stats?.difficulty || Difficulty.NORMAL;

    // メーター表示の割合を計算 (0-100)
    const speedPercent = Math.min((speed / Math.max(800, maxSpeed)) * 100, 100);
    const gravityPercent = Math.min((gravity / Math.max(20000, maxGravity)) * 100, 100);

    // 難易度ごとの色設定
    let diffColorClass = "text-cyan-500/60";
    if (difficulty === Difficulty.EXTREME) diffColorClass = "text-purple-500/60";
    else if (difficulty === Difficulty.HARD) diffColorClass = "text-red-500/60";
    else if (difficulty === Difficulty.EASY) diffColorClass = "text-emerald-500/60";

    return (
        <div className="w-full h-auto bg-transparent flex flex-col p-1 landscape:p-2 gap-1 landscape:gap-1.5 overflow-visible select-none relative">
            <style>{`
                .liquid-card {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(16px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.20);
                    box-shadow: 0 4px 15px -2px rgba(0, 0, 0, 0.3);
                }
                .glow-cyan { box-shadow: 0 0 10px rgba(6, 182, 212, 0.3); }
                .glow-pink { box-shadow: 0 0 10px rgba(236, 72, 153, 0.3); }
                .glow-white { box-shadow: 0 0 10px rgba(255, 255, 255, 0.2); }
                .bar-container { background: rgba(255, 255, 255, 0.1); }
            `}</style>

            {/* ヘッダー部分（横画面のみ） */}
            <div className="hidden landscape:flex shrink-0 items-center justify-between px-1 mr-2">
                <div className="text-[10px] text-cyan-500/80 font-bold tracking-[0.3em] uppercase">System Telemetry</div>
            </div>

            <div className="grid grid-cols-2 gap-1 landscape:gap-1 landscape:flex landscape:flex-col landscape:gap-1 landscape:mr-2">
                
                {/* 速度メーター */}
                <div className="col-span-1 liquid-card py-1 px-2 landscape:px-4 rounded-xl landscape:rounded-2xl flex flex-col justify-between hover:bg-white/10">
                    <div className="flex items-center landscape:items-end justify-between mb-0.5 landscape:mb-0.5">
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] landscape:text-[14px] text-gray-200 font-bold leading-tight">速度</span>
                            <span className="text-[8px] landscape:text-[10px] text-gray-500 font-bold font-mono">max: {Math.floor(maxSpeed)}</span>
                        </div>
                        <div className="flex items-baseline text-right">
                            <span className="text-lg landscape:text-2xl xl:text-4xl text-cyan-400 font-fugaz leading-none">
                                {Math.floor(speed)}
                            </span>
                            <span className="text-[8px] landscape:text-[11px] text-cyan-400/50 font-fugaz ml-0.5">px/s</span>
                        </div>
                    </div>
                    <div className="h-1 landscape:xl:h-2 w-full bar-container rounded-full overflow-hidden relative">
                        <div 
                            className="h-full bg-cyan-500 transition-all duration-300 ease-out glow-cyan" 
                            style={{ width: `${speedPercent}%` }}
                        ></div>
                    </div>
                </div>

                {/* 引力メーター */}
                <div className="col-span-1 liquid-card py-1 px-2 landscape:px-4 rounded-xl landscape:rounded-2xl flex flex-col justify-between hover:bg-white/10">
                    <div className="flex items-center landscape:items-end justify-between mb-0.5 landscape:mb-0.5">
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] landscape:text-[14px] text-gray-200 font-bold leading-tight">引力</span>
                            <span className="text-[8px] landscape:text-[10px] text-gray-500 font-bold font-mono">max: {Math.floor(maxGravity)}</span>
                        </div>
                        <div className="flex items-baseline text-right">
                            <span className="text-lg landscape:text-2xl xl:text-4xl text-pink-500 font-fugaz leading-none">
                                {Math.floor(gravity)}
                            </span>
                            <span className="text-[8px] landscape:text-[11px] text-pink-500/50 font-fugaz ml-0.5">N</span>
                        </div>
                    </div>
                    <div className="h-1 landscape:xl:h-2 w-full bar-container rounded-full overflow-hidden relative">
                        <div 
                            className="h-full bg-pink-600 transition-all duration-300 ease-out glow-pink" 
                            style={{ width: `${gravityPercent}%` }}
                        ></div>
                    </div>
                </div>

                {/* 残り・撃墜数 */}
                <div className="col-span-1 liquid-card py-1 px-2 landscape:px-4 rounded-xl landscape:rounded-2xl flex flex-col justify-between hover:bg-white/10">
                    <div className="flex items-center landscape:items-end justify-between mb-0.5 landscape:mb-0.5">
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] landscape:text-[14px] text-gray-200 font-bold leading-tight">
                                {mode === GameMode.SURVIVAL ? '残り' : '撃墜数'}
                            </span>
                            <span className="text-[8px] landscape:text-[10px] text-gray-500 font-bold font-mono uppercase">mode: {mode}</span>
                        </div>
                        <div className="flex items-baseline text-right">
                            {mode === GameMode.SURVIVAL ? (
                                <>
                                    <span className="text-lg landscape:text-2xl xl:text-4xl text-purple-400 font-fugaz leading-none">
                                        {currentEnemies}
                                    </span>
                                    <span className="text-[10px] landscape:text-[12px] text-purple-400/40 font-fugaz ml-0.5">/{initialEnemies}</span>
                                </>
                            ) : (
                                <span className="text-lg landscape:text-2xl xl:text-4xl text-purple-400 font-fugaz leading-none animate-pulse">
                                    {kills}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="h-1 landscape:xl:h-2 w-full bar-container rounded-full overflow-hidden relative">
                        <div 
                            className="h-full bg-gradient-to-r from-purple-800 to-purple-400 transition-all duration-500 glow-purple" 
                            style={{ width: `${mode === GameMode.SURVIVAL ? (currentEnemies/initialEnemies)*100 : Math.min(kills, 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* 経過時間 */}
                <div className="col-span-1 liquid-card py-1 px-2 landscape:px-4 rounded-xl landscape:rounded-2xl flex flex-col justify-between hover:bg-white/10">
                    <div className="flex items-center landscape:items-end justify-between mb-0.5 landscape:mb-1">
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] landscape:text-[14px] text-gray-200 font-bold leading-tight">生存時間</span>
                            <span className={`text-[8px] landscape:text-[10px] ${diffColorClass} font-bold uppercase tracking-tighter`}>{difficulty}</span>
                        </div>
                        <div className="flex items-baseline text-right">
                            <span className="text-lg landscape:text-2xl xl:text-4xl text-white font-fugaz leading-none">
                                {time.toFixed(1)}
                            </span>
                            <span className="text-[8px] landscape:text-[11px] text-white/40 font-fugaz ml-0.5 uppercase">sec</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default InfoPanel;