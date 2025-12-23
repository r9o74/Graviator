import React from 'react';
import { GameStats } from '../types';

interface InfoPanelProps {
    stats: GameStats | null;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ stats }) => {
    // Default values if stats are null (Menu state)
    const speed = stats?.speed || 0;
    const maxSpeed = stats?.maxSpeed || 0;
    const gravity = stats?.gravityForce || 0;
    const maxGravity = stats?.maxGravity || 0;
    const currentEnemies = stats?.currentEnemies || 7;
    const initialEnemies = stats?.initialEnemies || 7;
    const time = stats?.timeSurvived || 0;
    const danger = stats?.dangerLevel || 0;

    // Calculations for visual bars
    const speedPercent = Math.min((speed / 800) * 100, 100);
    const gravityPercent = Math.min((gravity / 10000) * 100, 100);
    const enemyHealthPercent = (currentEnemies / initialEnemies) * 100;

    return (
        <div className="
            w-full
            h-auto
            bg-transparent
            grid
            grid-cols-2
            gap-x-4
            gap-y-1
            p-3

            landscape:flex
            landscape:flex-col
            landscape:h-full
            landscape:justify-start
            landscape:p-3
            landscape:gap-3
        ">
            {/* Header */}
            <div className="
                col-span-2 
                landscape:col-span-1 
                relative z-10 
                flex 
                items-center 
                justify-between

                landscape:block 
                landscape:shrink-0
            ">
                <div className="
                    text-[10px]
                    landscape:text-[9px]
                    text-cyan-500
                    tracking-[0.3em]
                    whitespace-nowrap
                ">PLANET INFO</div>

                <div className="
                    h-px
                    flex-1
                    bg-gradient-to-r from-cyan-500/50 to-transparent
                    ml-4
                    landscape:ml-0
                    landscape:mt-1
                    landscape:mb-1
                    landscape:w-full
                "></div>
            </div>

            {/* Speed Gauge */}
            <div className="
                group
                relative
                z-10
                flex
                flex-col
                justify-end
                landscape:gap-0.5
                ">
                <div className="
                    flex
                    justify-between
                    items-end
                    text-gray-300
                    mb-0.5
                    ">
                    <div className="flex flex-col">
                        <span className="
                            text-[9px]
                            landscape:text-[8px]
                            text-gray-500
                            font-comfortaa
                            font-bold
                            whitespace-nowrap
                            ">MAX: <span className = "text-cyan-600">{Math.floor(maxSpeed)}</span></span>
                        <span className="
                            text-[10px]
                            landscape:text-[10px]
                            tracking-widest
                            ">速度</span>
                    </div>
                    <span className="
                        text-xl
                        landscape:text-lg
                        xl:text-2xl
                        text-cyan-400
                        font-fugaz
                        leading-none
                        ">
                        {Math.floor(speed)} <span className="
                                                text-[9px]
                                                landscape:text-[10px]
                                                font-fugaz
                                                font-bold
                                                text-cyan-400/60
                                                ">px/s</span>
                    </span>
                </div>
                <div className="
                    h-1.5 
                    landscape:h-1 
                    xl:landscape:h-1.5 
                    bg-gray-800 
                    rounded-sm 
                    overflow-hidden 
                    relative 
                    border 
                    border-white/5
                    ">
                    <div 
                        className="
                            h-full 
                            bg-cyan-500 
                            shadow-[0_0_10px_rgba(6,182,212,0.6)] 
                            transition-all 
                            duration-200 
                            ease-out"
                        style={{ width: `${speedPercent}%` }}
                    ></div>
                </div>
            </div>

            {/* Gravity Gauge */}
            <div className="
                relative 
                z-10 
                flex 
                flex-col 
                justify-end
                landscape:gap-0.5
                ">
                <div className="
                    flex 
                    justify-between 
                    items-end 
                    text-gray-300 
                    mb-0.5
                    ">
                    <div className="flex flex-col">
                        <span className="
                            text-[9px] 
                            landscape:text-[8px] 
                            text-gray-500 
                            font-comfortaa 
                            font-bold 
                            whitespace-nowrap
                            ">MAX: <span className = "text-pink-600">{Math.floor(maxGravity)}</span></span>
                        <span className="
                            text-[10px] 
                            landscape:text-[10px] 
                            tracking-widest
                            ">引力</span>
                    </div>
                    <span className="
                        text-xl 
                        landscape:text-lg 
                        xl:text-2xl 
                        text-pink-500 
                        font-fugaz
                        leading-none
                        ">
                        {Math.floor(gravity)} <span className="
                                                    text-[10px]
                                                    landscape:text-[11px]
                                                    font-fugaz
                                                    font-bold 
                                                    text-pink-500/60">N</span>
                    </span>
                </div>
                <div className="
                    h-1.5
                    landscape:h-1
                    xl:landscape:h-1.5
                    bg-gray-800
                    rounded-sm 
                    overflow-hidden 
                    relative 
                    border 
                    border-white/5
                    ">
                    <div 
                        className="
                            h-full 
                            bg-pink-600 
                            shadow-[0_0_10px_rgba(236,72,153,0.6)] 
                            transition-all 
                            duration-200 
                            ease-out"
                        style={{ width: `${gravityPercent}%` }}
                    ></div>
                </div>
            </div>

            {/* Enemies Status */}
            <div className="
                relative 
                z-10 
                flex 
                flex-col 
                justify-center
                landscape:gap-1
                ">
                <div className="
                    flex 
                    justify-between 
                    text-gray-300 
                    tracking-widest 
                    mb-0.5 
                    items-end
                    ">
                    <span className="
                        text-[10px] 
                        landscape:text-[10px]
                        ">残り敵数</span>
                    <span className="
                        text-sm 
                        landscape:text-sm 
                        text-pink-400/70 
                        font-fugaz 
                        leading-none
                        "><span className = 'text-2xl landscape:text-xl text-pink-400'>{currentEnemies}</span>/{initialEnemies}</span>
                </div>
                
                <div className="
                    h-2 
                    landscape:h-2 
                    xl:landscape:h-4 
                    bg-gray-900 
                    border 
                    border-pink-500/30 
                    rounded-sm 
                    overflow-hidden 
                    relative 
                    shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]">
                    <div className="
                            h-full
                            bg-gradient-to-r 
                            from-pink-900 via-pink-600 to-pink-500 
                            transition-all 
                            duration-500 
                            ease-out 
                            relative
                            "
                        style={{ width: `${enemyHealthPercent}%` }}
                    >
                    </div>
                </div>
            </div>

            {/* Mission Time */}
            <div className="
                relative 
                z-10 
                flex 
                flex-col 
                justify-end 
                ">
                 <div className="
                    flex 
                    justify-between 
                    items-end 
                    ">
                     <div className="
                        text-[10px] 
                        landscape:text-[10px] 
                        text-gray-300 
                        ">生存時間</div>
                     <div className="
                        text-xl 
                        landscape:text-lg 
                        text-white 
                        tracking-widest 
                        font-fugaz 
                        leading-none
                        ">
                        {time.toFixed(1)}<span className="
                                            text-[9px] 
                                            landscape:text-[10px] 
                                            text-gray-600 
                                            ml-1 
                                            font-comfortaa 
                                            font-bold
                                            ">s</span>
                     </div>
                 </div>
            </div>
        </div>
    );
};

export default InfoPanel;