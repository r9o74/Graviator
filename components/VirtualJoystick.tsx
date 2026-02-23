
import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { InputState } from '../types';

interface VirtualJoystickProps {
    onInput: (input: InputState) => void;
}

// タッチ操作用のアナログスティックコンポーネント
// 指定されたエリア内でのタッチ開始を検知し、ドラッグ操作は画面全体で追従する
const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onInput }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);
    const [origin, setOrigin] = useState({ x: 0, y: 0 }); // タッチ開始位置
    const [current, setCurrent] = useState({ x: 0, y: 0 }); // 現在の指の位置
    
    // イベントリスナー内で最新のstateを参照するためのRef
    const stateRef = useRef({ active: false, origin: { x: 0, y: 0 } });

    const maxRadius = 50;  // スティックの最大可動半径
    const deadZone = 5;    // 反応しない中心領域

    // stateをrefに同期
    useEffect(() => {
        stateRef.current = { active, origin };
    }, [active, origin]);

    // 入力計算処理
    const processInput = (originX: number, originY: number, currentX: number, currentY: number) => {
        const dx = currentX - originX;
        const dy = currentY - originY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let clampedX = dx;
        let clampedY = dy;
        
        if (distance > maxRadius) {
            const angle = Math.atan2(dy, dx);
            clampedX = Math.cos(angle) * maxRadius;
            clampedY = Math.sin(angle) * maxRadius;
        }

        let vectorX = 0;
        let vectorY = 0;

        if (distance > deadZone) {
            vectorX = clampedX / maxRadius;
            vectorY = clampedY / maxRadius;
        }

        const threshold = 0.3;
        onInput({
            up: vectorY < -threshold,
            down: vectorY > threshold,
            left: vectorX < -threshold,
            right: vectorX > threshold,
            vector: { x: vectorX, y: vectorY }
        });
    };

    // 操作開始（コンテナ要素で発火）
    const handleStart = (clientX: number, clientY: number) => {
        setOrigin({ x: clientX, y: clientY });
        setCurrent({ x: clientX, y: clientY });
        setActive(true);
        onInput({ up: false, down: false, left: false, right: false, vector: { x: 0, y: 0 } });
    };

    // 操作終了・移動（windowで発火）
    useEffect(() => {
        const handleMove = (clientX: number, clientY: number) => {
            const { active, origin } = stateRef.current;
            if (!active) return;
            
            setCurrent({ x: clientX, y: clientY });
            processInput(origin.x, origin.y, clientX, clientY);
        };

        const handleEnd = () => {
            const { active } = stateRef.current;
            if (!active) return;
            
            setActive(false);
            onInput({ up: false, down: false, left: false, right: false, vector: { x: 0, y: 0 } });
        };

        const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const onMouseUp = () => handleEnd();

        const onTouchMove = (e: TouchEvent) => {
            const { active } = stateRef.current;
            if (active) {
                // ゲーム操作中のスクロール防止
                if (e.cancelable) e.preventDefault();
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };
        const onTouchEnd = () => handleEnd();

        // 移動と終了は画面外に出ても追跡できるようにwindowに登録
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        
        const touchOpts = { passive: false };
        window.addEventListener('touchmove', onTouchMove, touchOpts as any);
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('touchcancel', onTouchEnd);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('touchcancel', onTouchEnd);
        };
    }, []);

    // Reactイベントハンドラ（コンテナ要素用）
    const onMouseDown = (e: React.MouseEvent) => {
        handleStart(e.clientX, e.clientY);
    };

    const onTouchStart = (e: React.TouchEvent) => {
        // e.preventDefault(); // 一部のブラウザで警告が出る場合があるため状況に応じて
        if (e.touches.length > 1) return;
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };

    // スティックの表示位置計算（Portal内用）
    const getStickStyle = () => {
        const dx = current.x - origin.x;
        const dy = current.y - origin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let x = dx;
        let y = dy;

        if (distance > maxRadius) {
            const angle = Math.atan2(dy, dx);
            x = Math.cos(angle) * maxRadius;
            y = Math.sin(angle) * maxRadius;
        }
        
        return { transform: `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0)` };
    };

    return (
        <div 
            ref={containerRef} 
            className="relative w-full h-full select-none touch-none"
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
        >
            {/* 待機中のガイド表示 */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${active ? 'opacity-30' : 'opacity-100'}`}>
                 <div className="flex flex-col items-center">
                    {/* ガイド用の外枠 */}
                    <div className="w-24 h-24 rounded-full border border-white/10 bg-white/5 flex items-center justify-center relative">
                        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center animate-pulse">
                            <div className="w-2 h-2 bg-cyan-400/30 rounded-full"></div>
                        </div>
                    </div>
                    <span className="mt-2 text-[10px] md:text-xs text-cyan-500/40 font-mono tracking-widest uppercase text-center">
                        Swipe to Move
                    </span>
                 </div>
            </div>

            {/* 操作中のスティック（フローティング表示） - Portalでbody直下に描画 */}
            {active && createPortal(
                <div 
                    className="fixed pointer-events-none z-[9999]"
                    style={{ left: origin.x, top: origin.y }}
                >
                    {/* 外枠リング */}
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-cyan-500/30 bg-cyan-500/10 backdrop-blur-xs shadow-[0_0_0px_rgba(6,182,212,0.2)]"></div>
                    {/* 動くスティック */}
                    <div 
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-cyan-400/50 backdrop-blur-xs shadow-[0_0_0px_rgba(34,211,238,0.6)]"
                        style={getStickStyle()}
                    ></div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default VirtualJoystick;
