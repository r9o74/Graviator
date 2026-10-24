import React, { useEffect, useState } from 'react';
import { ITEM_INFOS } from '../constants/items';
import { SpawnParams, createDefaultSpawnParams } from '../constants/testMode';
import { ItemIcon } from './ItemIcon';

interface TestModePanelProps {
    params: SpawnParams;
    onChange: (params: SpawnParams) => void;
}

// 数値入力（入力途中の空欄を許容し、0以上の有効な数値のときだけ反映する）
const NumberField = ({ value, onCommit, step = 1, className = '' }: {
    value: number;
    onCommit: (v: number) => void;
    step?: number;
    className?: string;
}) => {
    const [draft, setDraft] = useState(String(value));

    // RESET など外部から値が変わったら表示を同期
    useEffect(() => {
        if (Number(draft) !== value) setDraft(String(value));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <input
            type="number"
            inputMode="decimal"
            min={0}
            step={step}
            value={draft}
            onChange={(e) => {
                setDraft(e.target.value);
                const v = Number(e.target.value);
                if (e.target.value !== '' && Number.isFinite(v) && v >= 0) onCommit(v);
            }}
            onBlur={() => setDraft(String(value))}
            className={`bg-black/40 border border-white/20 rounded-md px-2 py-1 text-white font-orbitron text-xs text-right focus:outline-none focus:border-amber-400 ${className}`}
        />
    );
};

// テストモードのパラメータ設定（アイテム出現比率・出現タイミング）
export const TestModePanel: React.FC<TestModePanelProps> = ({ params, onChange }) => {
    const totalRatio = params.itemRatio.reduce((acc, v) => acc + v, 0);

    const setRatio = (index: number, v: number) => {
        const itemRatio = [...params.itemRatio];
        itemRatio[index] = v;
        onChange({ ...params, itemRatio });
    };

    return (
        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-400/40 space-y-4">
            <div>
                <h3 className="text-[11px] md:text-xs font-orbitron font-bold text-amber-300 tracking-[0.2em] uppercase">Test Mode</h3>
                <p className="text-[10px] text-white/50 font-rajdhani mt-1 leading-relaxed">
                    プレイは記録されません。名前の保存・ログイン・ログアウトで解除され、設定はデフォルトに戻ります。
                    出現比率と間隔は次の出現から、開始遅延は次のゲームから反映されます。
                </p>
            </div>

            {/* アイテム出現比率 */}
            <div>
                <p className="text-[10px] font-orbitron text-amber-400 tracking-widest uppercase mb-2">Item Ratio</p>
                <div className="grid grid-cols-3 gap-2">
                    {ITEM_INFOS.map(info => {
                        const ratio = params.itemRatio[info.type] ?? 0;
                        const percent = totalRatio > 0 ? (ratio / totalRatio) * 100 : 0;
                        return (
                            <div key={info.type} className="bg-white/[0.03] border border-white/10 rounded-lg p-1.5 flex flex-col items-center gap-1">
                                <ItemIcon type={info.type} className="w-8 h-8" />
                                <p className="text-white/50 text-[10px] font-rajdhani font-bold truncate max-w-full">{info.name}</p>
                                <NumberField value={ratio} onCommit={(v) => setRatio(info.type, v)} className="w-full" />
                                <p className="text-white/40 text-[9px] font-orbitron">{percent.toFixed(1)}%</p>
                            </div>
                        );
                    })}
                </div>
                {totalRatio === 0 && (
                    <p className="text-[10px] text-amber-300 font-rajdhani mt-1">比率の合計が0のため、アイテムは出現しません。</p>
                )}
            </div>

            {/* 出現タイミング */}
            <div>
                <p className="text-[10px] font-orbitron text-amber-400 tracking-widest uppercase mb-2">Spawn Timing (sec)</p>
                <div className="space-y-1.5">
                    {([
                        ['startDelay', 'ITEM_SPAWN_START_DELAY'],
                        ['intervalMin', 'ITEM_SPAWN_INTERVAL_MIN'],
                        ['intervalMax', 'ITEM_SPAWN_INTERVAL_MAX'],
                    ] as const).map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between gap-2">
                            <span className="text-white/60 text-[10px] font-orbitron tracking-wider truncate">{label}</span>
                            <NumberField value={params[key]} step={0.5} onCommit={(v) => onChange({ ...params, [key]: v })} className="w-20 shrink-0" />
                        </div>
                    ))}
                </div>
                {params.intervalMin > params.intervalMax && (
                    <p className="text-[10px] text-amber-300 font-rajdhani mt-1">MIN が MAX より大きいため、入れ替えて使用されます。</p>
                )}
            </div>

            <button
                onClick={() => onChange(createDefaultSpawnParams())}
                className="w-full py-1.5 text-white/80 hover:text-white font-orbitron font-bold text-[10px] tracking-widest uppercase transition-all bg-white/5 hover:bg-white/15 rounded-lg border border-white/15"
            >
                RESET TO DEFAULT
            </button>
        </div>
    );
};
