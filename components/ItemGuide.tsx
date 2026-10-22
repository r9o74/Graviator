import React from 'react';
import { ITEM_INFOS } from '../constants/items';
import { ItemIcon } from './ItemIcon';

interface ItemGuideProps {
    onClose: () => void;
}

// アイテム一覧と説明を表示するモーダルコンポーネント
export const ItemGuide: React.FC<ItemGuideProps> = ({ onClose }) => {
    return (
        <div className="w-full h-full flex flex-col relative z-20">
            <div className="flex items-center justify-between mb-2 shrink-0">
                <h2 className="text-2xl font-fugaz text-cyan-400">ITEM GUIDE</h2>
                <button
                    onClick={onClose}
                    className="p-2 text-white/70 hover:text-white transition-colors"
                >
                    ✕
                </button>
            </div>

            {/* アイテムリスト（種類が増えた時用にスクロール可能） */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {ITEM_INFOS.map((info) => (
                    <div key={info.type} className="group relative flex items-center bg-white/5 rounded-xl p-3 border border-white/15 hover:bg-white/10 transition-colors overflow-hidden">
                        {/* 背景英語名 (ホバー時のみ表示) */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                            <span className="mt-2 font-fugaz font-black text-6xl text-white opacity-0 group-hover:opacity-10 transition-opacity duration-500 whitespace-nowrap scale-110">
                                {info.englishName}
                            </span>
                        </div>

                        <div className="relative z-10 shrink-0 mr-4 flex items-center justify-center bg-black/20 rounded-lg w-[60px] h-[60px]">
                            <ItemIcon type={info.type} />
                        </div>
                        <div className="relative z-10 flex-1 text-left">
                            <h3 className="text-md font-black font-fugaz text-white tracking-widest mb-1">{info.name}</h3>
                            <p className="text-xs text-white-300/40 font-comfortaa leading-relaxed">{info.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
};