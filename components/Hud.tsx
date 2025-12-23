import React from 'react';

const Hud: React.FC = () => {
    return (
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between overflow-hidden">
            {/* Top Bar Area */}
            <div className="flex justify-between items-start">
                <div className="flex flex-col relative group">
                    <div className="absolute -left-4 top-0 w-1 h-full bg-cyan-500/50 rounded-r opacity-50"></div>
                    <div className="pl-4">
                        <div className="text-[10px] font-mono text-cyan-400 mb-1 tracking-[0.2em] flex items-center">
                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-2 animate-pulse"></span>
                            SYSTEM_ONLINE
                        </div>
                        <div className="flex items-center space-x-1">
                             <div className="h-1.5 w-8 bg-cyan-500/20 rounded-sm skew-x-[-12deg] overflow-hidden">
                                 <div className="h-full bg-cyan-400 w-full animate-pulse origin-left"></div>
                             </div>
                             <div className="h-1.5 w-16 bg-cyan-500/20 rounded-sm skew-x-[-12deg] overflow-hidden">
                                 <div className="h-full bg-cyan-400 w-[80%]"></div>
                             </div>
                        </div>
                    </div>
                </div>
                
                {/* Gravity Well Status */}
                <div className="flex flex-col items-end">
                    <div className="bg-black/30 backdrop-blur-md border border-white/10 px-4 py-1 rounded-sm flex items-center space-x-3 skew-x-[-12deg]">
                        <span className="skew-x-[12deg] font-mono text-[10px] text-white/50 tracking-widest">GRAVITY WELL</span>
                        <div className="skew-x-[12deg] w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></div>
                    </div>
                    <div className="mt-1 flex space-x-1">
                        {[...Array(5)].map((_, i) => (
                             <div key={i} className="w-6 h-0.5 bg-white/10 skew-x-[-12deg]"></div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Middle Area: Reticles */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border border-white/5 rounded-full opacity-20 pointer-events-none"></div>
            <div className="absolute top-1/2 left-4 w-1 h-12 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
            <div className="absolute top-1/2 right-4 w-1 h-12 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

            {/* Bottom Bar Area */}
            <div className="flex justify-between items-end">
                 <div className="flex items-center space-x-4">
                     <div className="text-[9px] text-white/30 font-mono tracking-widest border-l-2 border-white/10 pl-2">
                         COORD: <span className="text-white/60">{Math.floor(Math.random() * 999)}.{Math.floor(Math.random() * 99)}</span>
                     </div>
                     <div className="text-[9px] text-white/30 font-mono tracking-widest hidden sm:block">
                         VELOCITY: <span className="text-cyan-400/80">NOMINAL</span>
                     </div>
                 </div>
                 
                 <div className="text-right">
                     <div className="text-[40px] leading-none font-bold font-mono text-white/5 opacity-50">05</div>
                     <div className="text-[9px] text-white/20 font-mono tracking-[0.3em] uppercase -mt-1">Sector V</div>
                 </div>
            </div>
            
            {/* Warning Borders - Decorative */}
            <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-cyan-500/20 rounded-tl-lg pointer-events-none"></div>
            <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-cyan-500/20 rounded-tr-lg pointer-events-none"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-cyan-500/20 rounded-bl-lg pointer-events-none"></div>
            <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-cyan-500/20 rounded-br-lg pointer-events-none"></div>
        </div>
    );
}

export default Hud;