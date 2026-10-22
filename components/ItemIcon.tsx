import React, { useEffect, useRef } from 'react';
import { Item } from '../game/entities/Item';
import { ItemType } from '../types';

// アイテムのアイコンの描画コンポーネント（Engineの描画ロジックを流用）
export const ItemIcon = ({ type, className = 'w-[60px] h-[60px]' }: { type: ItemType; className?: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // アイテムインスタンスを作成して描画
        const item = new Item(canvas.width / 2, canvas.height / 2, type);
        let animId: number;

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            item.update(0.016); // 少し回転させる
            item.draw(ctx, 1.0); // scaleFactor = 1.0
            animId = requestAnimationFrame(render);
        };
        render();

        return () => cancelAnimationFrame(animId);
    }, [type]);

    return <canvas ref={canvasRef} width={80} height={80} className={className} />;
};
