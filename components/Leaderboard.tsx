import React, { useEffect, useState } from 'react';
import { GameMode, Difficulty, ScoreRecord } from '../types';
import { getLeaderboard } from '../lib/supabase';

interface LeaderboardProps {
    onClose: () => void;
    currentMode?: GameMode;
    currentDifficulty?: Difficulty;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onClose, currentMode = GameMode.SURVIVAL, currentDifficulty = Difficulty.NORMAL }) => {
    const [mode, setMode] = useState<GameMode>(currentMode === GameMode.TUTORIAL ? GameMode.SURVIVAL : currentMode);
    const [difficulty, setDifficulty] = useState<Difficulty>(currentDifficulty);
    const [scores, setScores] = useState<ScoreRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchScores = async () => {
            setLoading(true);
            
            // タイムアウト処理を追加（Supabaseの呼び出しがハングした場合の対策）
            const timeoutPromise = new Promise<ScoreRecord[]>((resolve) => {
                setTimeout(() => resolve([]), 5000); // 5秒でタイムアウト
            });
            
            try {
                const data = await Promise.race([
                    getLeaderboard(mode, difficulty),
                    timeoutPromise
                ]);
                if (isMounted) {
                    setScores(data);
                    setLoading(false);
                }
            } catch (e) {
                if (isMounted) {
                    setScores([]);
                    setLoading(false);
                }
            }
        };
        fetchScores();
        
        return () => {
            isMounted = false;
        };
    }, [mode, difficulty]);

    // キーボードショートカット
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch(e.key.toLowerCase()) {
                case '1':
                    setDifficulty(Difficulty.EASY);
                    break;
                case '2':
                    setDifficulty(Difficulty.NORMAL);
                    break;
                case '3':
                    setDifficulty(Difficulty.HARD);
                    break;
                case '4':
                    setDifficulty(Difficulty.EXTREME);
                    break;
                case 's':
                    setMode(GameMode.SURVIVAL);
                    break;
                case 'e':
                    setMode(GameMode.ENDLESS);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
    };

    const formatScore = (val: number) => {
        if (mode === GameMode.SURVIVAL) {
            return `${val.toFixed(2)}s`;
        }
        return `${Math.floor(val)}`;
    };

    return (
        <div className="w-full h-full flex flex-col relative z-20">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex flex-col">
                    <h2 className="text-2xl md:text-3xl font-fugaz text-cyan-400 tracking-wider">RANKING</h2>
                    <span className="text-[10px] text-white/40 font-rajdhani tracking-[0.3em]">GLOBAL LEADERBOARD</span>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 text-white/50 hover:text-white transition-colors bg-white/5 rounded-full hover:bg-white/20"
                >
                    ✕
                </button>
            </div>

            {/* モード選択タブ */}
            <div className="flex p-1 bg-black/40 rounded-xl mb-4 shrink-0 border border-white/10">
                <button 
                    onClick={() => setMode(GameMode.SURVIVAL)}
                    className={`flex-1 py-2 text-xs font-orbitron font-bold tracking-widest rounded-lg transition-all ${mode === GameMode.SURVIVAL ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                    SURVIVAL <span className="hidden md:inline text-[9px] opacity-50 ml-1">[S]</span>
                </button>
                <button 
                    onClick={() => setMode(GameMode.ENDLESS)}
                    className={`flex-1 py-2 text-xs font-orbitron font-bold tracking-widest rounded-lg transition-all ${mode === GameMode.ENDLESS ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/50' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                    ENDLESS <span className="hidden md:inline text-[9px] opacity-50 ml-1">[E]</span>
                </button>
            </div>

            {/* 難易度選択 */}
            <div className="flex gap-2 justify-center mb-4 shrink-0">
                {(Object.values(Difficulty) as Difficulty[]).map((diff) => {
                    let keyHint = '';
                    if (diff === Difficulty.EASY) keyHint = '1';
                    if (diff === Difficulty.NORMAL) keyHint = '2';
                    if (diff === Difficulty.HARD) keyHint = '3';
                    if (diff === Difficulty.EXTREME) keyHint = '4';
                    
                    return (
                        <button
                            key={diff}
                            onClick={() => setDifficulty(diff)}
                            className={`px-3 py-1 text-[10px] md:text-xs font-orbitron tracking-wider border rounded-full transition-all group relative overflow-hidden ${
                                difficulty === diff 
                                    ? (diff === Difficulty.EXTREME ? 'border-purple-500 text-purple-400 bg-purple-500/10' : diff === Difficulty.HARD ? 'border-red-500 text-red-400 bg-red-500/10' : diff === Difficulty.EASY ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-cyan-500 text-cyan-400 bg-cyan-500/10')
                                    : 'border-white/10 text-white/30 hover:border-white/30 hover:text-white/60'
                            }`}
                        >
                            {diff}
                            {keyHint && <span className="hidden md:inline-block ml-1 opacity-30 text-[8px]">[{keyHint}]</span>}
                        </button>
                    );
                })}
            </div>

            {/* ランキングリスト */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 rounded-xl border border-white/5 p-1">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-cyan-500/50 font-mono animate-pulse">LOADING DATA...</span>
                        </div>
                    </div>
                ) : scores.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-white/20 font-rajdhani tracking-widest text-sm">
                        NO RECORDS FOUND
                    </div>
                ) : (
                    <table className="w-full border-collapse">
                        <thead className="text-[10px] text-white/30 font-orbitron tracking-widest uppercase sticky top-0 bg-[#0a0a10] z-10">
                            <tr>
                                <th className="py-2 text-center w-12">#</th>
                                <th className="py-2 text-left">ID</th>
                                <th className="py-2 text-right">DATE</th>
                                <th className="py-2 text-right pr-4">SCORE</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs md:text-sm font-rajdhani font-semibold">
                            {scores.map((record, index) => (
                                <tr key={record.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-3 text-center text-white/40 font-mono">
                                        {index + 1}
                                    </td>
                                    <td className="py-3 text-white/70">
                                        {/* record.user_name があれば表示、なければIDを表示 */}
                                        {record.user_name && record.user_name.toLowerCase() !== 'player' ? (
                                            record.user_name
                                        ) : (
                                            <>
                                                <span className="font-mono text-white/30">User-</span>
                                                {record.user_id ? record.user_id.slice(0, 8) : 'Unknown'}...
                                            </>
                                        )}
                                    </td>    
                                    <td className="py-3 text-right text-white/30 text-[10px]">
                                        {formatDate(record.created_at)}
                                    </td>
                                    <td className={`py-3 text-right pr-4 font-light font-fugaz text-lg ${mode === GameMode.SURVIVAL ? 'text-cyan-400' : 'text-pink-400'}`}>
                                        {formatScore(record.score)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.2);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
};