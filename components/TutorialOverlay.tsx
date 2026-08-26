import React from 'react';

interface TutorialOverlayProps {
    step: string;
    message: string;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, message }) => {
    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-50">
            <style>{`
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-down { animation: fadeInDown 0.5s ease-out forwards; }
                .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
            `}</style>
            
            {/* ステップ表示 */}
            <div className="absolute top-20 md:top-10 animate-fade-in-down">
                <div className="bg-black/60 backdrop-blur-md border border-cyan-500/30 px-6 py-2 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <span className="text-cyan-400 font-orbitron font-bold tracking-[0.2em] text-sm md:text-base">
                        {step}
                    </span>
                </div>
            </div>

            {/* メッセージ表示 */}
            <div className="absolute bottom-32 md:bottom-10 w-full px-4 flex justify-center animate-fade-in-up">
                <div className="bg-black/30 backdrop-blur-xs border-t-2 border-b-2 border-cyan-500/30 py-2 px-8 md:px-12 max-w-2xl w-full text-center shadow-[0_0_30px_rgba(0,0,0,0.0)] relative overflow-hidden">
                    {/* 背景の装飾 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-900/20 to-transparent animate-pulse"></div>
                    
                    {/* テキスト */}
                    <p className="text-white font-rajdhani text-md md:text-xl tracking-wider relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                        {message}
                    </p>

                    {/* 装飾ライン */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
                </div>
            </div>
        </div>
    );
};
