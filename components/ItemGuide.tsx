import React, { useEffect, useRef } from 'react';
import { Item, ItemType } from '../game/Engine';

interface ItemInfo {
    type: ItemType;
    name: string;
    desc: string;
}

const ITEM_INFOS: ItemInfo[] = [
    { type: ItemType.MASS_BOOST, name: "質量増加", desc: "質量が大幅に増加し、敵を引き寄せる力が強くなる。" },
    { type: ItemType.SATELLITE, name: "衛星", desc: "周囲に7つの衛星を発射し、近くの敵を自動で迎撃する。" },
    { type: ItemType.INVISIBILITY, name: "透明化", desc: "敵から認識されなくなる。一部アイテムの影響も受けなくなる" },
    { type: ItemType.GRAVITY_WAVE, name: "重力波", desc: "周囲に強力な重力波を放ち、範囲内の敵を弾き飛ばす。" },
    { type: ItemType.INVERSION, name: "反転", desc: "引力を斥力に反転させ、近づく敵を押し返す。" },
    { type: ItemType.REPULSIVE_TRAIL, name: "軌斥", desc: "移動した軌跡に壁判定を残し、触れた敵を弾き返す。" },
    { type: ItemType.CAPTURE, name: "強奪", desc: "接近した敵からアイテム効果を奪い取る。" },
];

const ItemIcon = ({ type }: { type: ItemType }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const item = new Item(canvas.width / 2, canvas.height / 2, type);
        let animId: number;

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            item.update(0.016); // Rotate effect
            item.draw(ctx, 1.0); // scaleFactor 1.0
            animId = requestAnimationFrame(render);
        };
        render();

        return () => cancelAnimationFrame(animId);
    }, [type]);

    return <canvas ref={canvasRef} width={60} height={60} className="w-[60px] h-[60px]" />;
};

interface ItemGuideProps {
    onClose: () => void;
}

export const ItemGuide: React.FC<ItemGuideProps> = ({ onClose }) => {
    return (
        <div className="w-full h-full flex flex-col relative z-20">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="text-2xl font-fugaz text-cyan-400 tracking-wider">ITEM DATA</h2>
                <button 
                    onClick={onClose}
                    className="p-2 text-white/50 hover:text-white transition-colors"
                >
                    ✕
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {ITEM_INFOS.map((info) => (
                    <div key={info.type} className="flex items-center bg-white/5 rounded-xl p-3 border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="shrink-0 mr-4 flex items-center justify-center bg-black/20 rounded-lg w-[60px] h-[60px]">
                            <ItemIcon type={info.type} />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="text-sm font-bold font-fugaz text-white tracking-widest mb-1">{info.name}</h3>
                            <p className="text-xs text-gray-400 font-comfortaa leading-relaxed">{info.desc}</p>
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
