import React, { useState } from 'react';

interface SettingsModalProps {
    onClose: () => void;
    userName: string;
    setUserName: (name: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, userName, setUserName }) => {
    const [inputName, setInputName] = useState(userName);

    const handleSave = () => {
        const trimmedName = inputName.trim() || 'Player';
        // ローカルストレージに保存
        localStorage.setItem('graviator_name', trimmedName);
        // 親コンポーネント（App）の状態を更新
        setUserName(trimmedName);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    return (
        <div className="w-full h-full flex flex-col relative z-20">
            <div className="flex items-center justify-between mb-6 shrink-0">
                <h2 className="text-2xl font-fugaz text-cyan-400">SETTINGS</h2>
                <button 
                    onClick={onClose}
                    className="p-2 text-white/70 hover:text-white transition-colors"
                >
                    ✕
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {/* ユーザー名設定セクション */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <label className="block text-xs font-orbitron text-cyan-500 tracking-widest mb-2 uppercase">
                        Your Name
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputName}
                            onChange={(e) => setInputName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            maxLength={20}
                            className="flex-1 bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white font-rajdhani font-bold focus:outline-none focus:border-cyan-500 transition-colors placeholder-white/20"
                            placeholder="ENTER NAME"
                        />
                    </div>
                    <p className="text-[10px] text-white/30 mt-2 font-rajdhani">
                        設定した名前はランキングに表示されます (最大20文字)
                    </p>
                </div>

                {/* 将来的な設定項目（音量など）のためのプレースホルダー */}
                {/* 
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 opacity-50 pointer-events-none">
                    <label className="block text-xs font-orbitron text-white/50 tracking-widest mb-2 uppercase">
                        Sound Volume (Coming Soon)
                    </label>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="w-1/2 h-full bg-white/30"></div>
                    </div>
                </div>
                */}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-orbitron font-bold text-xs tracking-widest rounded-lg transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                >
                    SAVE CHANGES
                </button>
            </div>
        </div>
    );
};
