import React, { useRef, useState } from 'react';
import { InputState } from '../types';

interface VirtualJoystickProps {
    onInput: (input: InputState) => void;
}

// タッチ操作用のアナログスティックコンポーネント
const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onInput }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const stickRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);
    const [origin, setOrigin] = useState({ x: 0, y: 0 }); // タッチ開始位置（スティックの中心）
    
    // 設定
    const maxRadius = 40;  // スティックの最大可動半径
    const deadZone = 5;    // 反応しない中心領域

    // DOM直接操作でパフォーマンスを確保（Reactの再レンダリングを回避）
    const updateStick = (x: number, y: number) => {
        if (stickRef.current) {
            stickRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        }
    };

    // 操作開始（マウスダウン/タッチスタート）
    const handleStart = (clientX: number, clientY: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        
        // コンテナ内での相対座標を計算
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        setOrigin({ x, y });
        setActive(true);
        
        // 視覚的なスティック位置をリセット
        updateStick(0, 0);
        
        // 入力状態をリセット
        onInput({ up: false, down: false, left: false, right: false, vector: { x: 0, y: 0 } });
    };

    // 操作中（マウス移動/タッチ移動）
    const handleMove = (clientX: number, clientY: number) => {
        if (!active || !containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const currentX = clientX - rect.left;
        const currentY = clientY - rect.top;

        // 中心からの変位
        const dx = currentX - origin.x;
        const dy = currentY - origin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 半径内に制限
        let clampedX = dx;
        let clampedY = dy;
        
        if (distance > maxRadius) {
            const angle = Math.atan2(dy, dx);
            clampedX = Math.cos(angle) * maxRadius;
            clampedY = Math.sin(angle) * maxRadius;
        }

        // DOM更新
        updateStick(clampedX, clampedY);

        // 正規化されたベクトル入力 (-1.0 to 1.0) を計算
        let vectorX = 0;
        let vectorY = 0;

        if (distance > deadZone) {
            vectorX = clampedX / maxRadius;
            vectorY = clampedY / maxRadius;
        }

        const threshold = 0.3; // デジタル入力（キーボード相当）の判定しきい値
        onInput({
            up: vectorY < -threshold,
            down: vectorY > threshold,
            left: vectorX < -threshold,
            right: vectorX > threshold,
            vector: { x: vectorX * maxRadius, y: vectorY * maxRadius} // エンジン側で正規化するため生の値に近いものを渡す
        });
    };

    // 操作終了
    const handleEnd = () => {
        setActive(false);
        updateStick(0, 0);
        onInput({ up: false, down: false, left: false, right: false, vector: { x: 0, y: 0 } });
    };

    // マウスイベント
    const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
    const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();
    const onMouseLeave = () => handleEnd();

    // タッチイベント
    const onTouchStart = (e: React.TouchEvent) => {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: React.TouchEvent) => {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        handleEnd();
    };

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-full select-none touch-none overflow-hidden cursor-crosshair group"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* 待機中のガイド表示 */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none ${active ? 'opacity-0' : 'opacity-100'}`}>
                 <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center animate-pulse">
                        <div className="w-2 h-2 bg-cyan-400/50 rounded-full"></div>
                    </div>
                    <span className="mt-2 text-[15px] text-cyan-500/60 font-mono tracking-widest uppercase">Swipe to Thrust!</span>
                 </div>
            </div>

            {/* ジョイスティックの可視部分 */}
            <div 
                className="absolute pointer-events-none will-change-transform"
                style={{ 
                    left: origin.x, 
                    top: origin.y, 
                    opacity: active ? 1 : 0,
                    transform: 'translate(-50%, -50%)',
                    transition: 'opacity 0.1s ease-out'
                }}
            >
                {/* 外枠リング */}
                <div className="w-24 h-24 rounded-full border border-cyan-500/30 bg-black/40 flex items-center justify-center relative shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                    {/* 操作スティック */}
                    <div 
                        ref={stickRef}
                        className="w-8 h-8 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] will-change-transform"
                        style={{
                            transform: `translate3d(0, 0, 0)`
                        }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default VirtualJoystick;