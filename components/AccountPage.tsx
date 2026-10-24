import React, { useEffect, useState } from 'react';
import { Difficulty } from '../types';
import { signInWithGoogle, signOut } from '../lib/supabase';
import { fetchPlayerStats, PlayerStatsSummary } from '../lib/stats';
import { ITEM_INFOS, ITEM_KEYS } from '../constants/items';
import { DISTANCE_DISPLAY_SCALE, DISTANCE_UNIT_LABEL } from '../constants/gameConfig';
import { ItemIcon } from './ItemIcon';
import { TestModePanel } from './TestModePanel';
import { SpawnParams } from '../constants/testMode';

interface AccountPageProps {
    onClose: () => void;
    userId: string | null;
    isAnonymous: boolean;
    userName: string;
    // 名前の保存（テストモードのコードなら App 側で有効化し 'test-mode' を返す）
    onSaveName: (input: string) => 'test-mode' | 'saved';
    isTestMode: boolean;
    testSpawnParams: SpawnParams;
    setTestSpawnParams: (params: SpawnParams) => void;
}

const DIFFICULTY_ROWS: { difficulty: Difficulty; color: string }[] = [
    { difficulty: Difficulty.EASY, color: 'text-emerald-400' },
    { difficulty: Difficulty.NORMAL, color: 'text-cyan-400' },
    { difficulty: Difficulty.HARD, color: 'text-red-400' },
    { difficulty: Difficulty.EXTREME, color: 'text-purple-400' },
];

const NO_RECORD = '—';
const formatInt = (n: number) => Math.round(n).toLocaleString();
const formatClearTime = (t: number | null) => (t === null ? NO_RECORD : `${t.toFixed(2)}s`);
const formatDuration = (sec: number) => {
    const total = Math.floor(sec);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-[11px] md:text-xs font-orbitron font-bold text-cyan-500 tracking-[0.2em] uppercase mb-2">{children}</h3>
);

const StatTile = ({ label, value }: { label: string; value: string }) => (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl py-2 px-1 text-center">
        <p className="text-white/40 font-orbitron text-[8px] md:text-[10px] tracking-[0.15em] uppercase">{label}</p>
        <p className="text-white font-orbitron text-sm md:text-base font-bold tracking-wider break-all">{value}</p>
    </div>
);

// アカウントページ：ユーザー情報・名前変更・ログイン/ログアウト・個人記録
export const AccountPage: React.FC<AccountPageProps> = ({
    onClose, userId, isAnonymous, userName, onSaveName, isTestMode, testSpawnParams, setTestSpawnParams
}) => {
    const [inputName, setInputName] = useState(userName);
    const [saveLabel, setSaveLabel] = useState<'SAVE' | 'SAVED' | 'TEST ON'>('SAVE');
    const [idCopied, setIdCopied] = useState(false);
    const [stats, setStats] = useState<PlayerStatsSummary | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');

    const isLoggedIn = !!userId && !isAnonymous;

    // 開くたびに最新の記録を取得（ログイン済みのみ）
    useEffect(() => {
        if (!isLoggedIn) return;
        let cancelled = false;
        setStatus('loading');
        fetchPlayerStats().then(result => {
            if (cancelled) return;
            setStats(result);
            setStatus(result ? 'ready' : 'error');
        });
        return () => { cancelled = true; };
    }, [isLoggedIn, userId]);

    const handleSaveName = () => {
        const result = onSaveName(inputName);
        if (result === 'test-mode') {
            // コードは名前として保存しない。入力欄は現在の名前に戻す
            setInputName(userName);
            setSaveLabel('TEST ON');
        } else {
            setInputName(inputName.trim() || 'Player');
            setSaveLabel('SAVED');
        }
        setTimeout(() => setSaveLabel('SAVE'), 1500);
    };

    const handleCopyId = async () => {
        if (!userId) return;
        try {
            await navigator.clipboard.writeText(userId);
            setIdCopied(true);
            setTimeout(() => setIdCopied(false), 1500);
        } catch (e) {
            console.error('Failed to copy user id:', e);
        }
    };

    return (
        <div className="w-full h-full flex flex-col relative z-20">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="text-2xl font-fugaz text-cyan-400">ACCOUNT</h2>
                <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-colors">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-5 text-left">
                {/* ユーザー情報 */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="text-[10px] font-orbitron text-cyan-500 tracking-widest uppercase">User ID</p>
                            <p className="font-mono text-white text-sm">{userId ? `${userId.slice(0, 8)}...` : NO_RECORD}</p>
                        </div>
                        {userId && (
                            <button
                                onClick={handleCopyId}
                                className="px-3 py-1 text-[10px] font-orbitron font-bold tracking-widest text-white/80 hover:text-white bg-white/5 hover:bg-white/20 border border-white/10 rounded-lg transition-all"
                            >
                                {idCopied ? 'COPIED' : 'COPY'}
                            </button>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-orbitron text-cyan-500 tracking-widest uppercase mb-1">Your Name</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputName}
                                onChange={(e) => setInputName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
                                maxLength={20}
                                className="flex-1 min-w-0 bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-white font-rajdhani font-bold focus:outline-none focus:border-cyan-500 transition-colors placeholder-white/20"
                                placeholder="ENTER NAME"
                            />
                            <button
                                onClick={handleSaveName}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-orbitron font-bold text-[10px] tracking-widest rounded-lg transition-all"
                            >
                                {saveLabel}
                            </button>
                        </div>
                        <p className="text-[10px] text-white/30 mt-1 font-rajdhani">設定した名前はランキングに表示されます (最大20文字)</p>
                    </div>

                    {isLoggedIn ? (
                        <button
                            onClick={signOut}
                            className="w-full py-2 text-white/80 hover:text-white font-orbitron font-bold text-[10px] tracking-widest uppercase transition-all bg-red-600/30 rounded-xl border border-red-500/50 hover:bg-red-600/50"
                        >
                            LOGOUT
                        </button>
                    ) : null}
                </div>

                {/* テストモード中：記録欄の位置にパラメータ設定を表示 */}
                {isTestMode && <TestModePanel params={testSpawnParams} onChange={setTestSpawnParams} />}

                {!isLoggedIn ? (
                    // 匿名時：記録欄の代わりにログイン案内
                    <div className="bg-white/5 rounded-xl p-4 border border-blue-500/30 text-center space-y-3">
                        <p className="text-white/80 text-xs font-rajdhani font-semibold">
                            Googleでログインすると、プレイ記録が保存されます。
                        </p>
                        <button
                            onClick={signInWithGoogle}
                            className="w-full py-2 text-white/80 hover:text-white font-orbitron font-bold text-[10px] tracking-widest uppercase transition-all bg-blue-600/30 rounded-xl border border-blue-500/50 hover:bg-blue-600/50"
                        >
                            LOGIN WITH GOOGLE
                        </button>
                    </div>
                ) : isTestMode ? null : status === 'loading' || status === 'idle' ? (
                    <p className="text-center text-white/40 font-orbitron text-xs tracking-[0.3em] py-6 animate-pulse">LOADING...</p>
                ) : status === 'error' || !stats ? (
                    <p className="text-center text-red-400/80 text-xs font-rajdhani py-6">記録を読み込めませんでした</p>
                ) : (
                    <>
                        {/* 最高記録 */}
                        <div>
                            <SectionTitle>Best Records</SectionTitle>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                                <StatTile label="最高速度" value={`${formatInt(stats.bestSpeed)} px/s`} />
                                <StatTile label="最大引力" value={`${formatInt(stats.bestGravity)} N`} />
                                <StatTile label="使用アイテム" value={formatInt(stats.bestItemsUsed)} />
                            </div>
                            <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
                                <table className="w-full text-center">
                                    <thead>
                                        <tr className="text-white/40 font-orbitron text-[8px] md:text-[10px] tracking-[0.1em] uppercase">
                                            <th className="py-1.5 font-normal">難易度</th>
                                            <th className="py-1.5 font-normal">ENDLESS撃墜数</th>
                                            <th className="py-1.5 font-normal">SURVIVALクリア</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {DIFFICULTY_ROWS.map(({ difficulty, color }) => {
                                            const kills = stats.endlessKillsByDifficulty[difficulty];
                                            return (
                                                <tr key={difficulty} className="border-t border-white/5 font-orbitron text-xs md:text-sm">
                                                    <td className={`py-1.5 font-bold ${color}`}>{difficulty}</td>
                                                    <td className="py-1.5 text-white">{kills === null ? NO_RECORD : formatInt(kills)}</td>
                                                    <td className="py-1.5 text-white">{formatClearTime(stats.survivalClearTimeByDifficulty[difficulty])}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 通算記録 */}
                        <div>
                            <SectionTitle>Total Records</SectionTitle>
                            <div className="grid grid-cols-3 gap-2">
                                <StatTile label="移動距離" value={`${formatInt(stats.totalDistance * DISTANCE_DISPLAY_SCALE)} ${DISTANCE_UNIT_LABEL}`} />
                                <StatTile label="撃墜数" value={formatInt(stats.totalKills)} />
                                <StatTile label="生存時間" value={formatDuration(stats.totalSurvivalTime)} />
                            </div>
                        </div>

                        {/* アイテム別使用数 */}
                        <div>
                            <SectionTitle>Item Usage</SectionTitle>
                            <div className="grid grid-cols-3 gap-2">
                                {ITEM_INFOS.map(info => (
                                    <div key={info.type} className="bg-white/[0.03] border border-white/10 rounded-xl p-2 flex flex-col items-center">
                                        <ItemIcon type={info.type} className="w-10 h-10" />
                                        <p className="text-white/50 text-[10px] font-rajdhani font-bold truncate max-w-full">{info.name}</p>
                                        <p className="text-white font-orbitron text-sm font-bold">{formatInt(stats.itemTotals[ITEM_KEYS[info.type]] ?? 0)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
