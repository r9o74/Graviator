import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { InputState } from '../types';

interface VirtualJoystickProps {
    onInput: (input: InputState) => void;
}

// タッチ操作用のアナログスティックコンポーネント
// 画面のどこをタッチしても操作可能なフローティング方式
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

    // イベントリスナーの登録
    useEffect(() => {
        const handleStart = (clientX: number, clientY: number, target: EventTarget | null) => {
            // コンポーネントが表示されていない場合（親要素が非表示など）は無効
            if (!containerRef.current || containerRef.current.offsetParent === null) return;
            
            // ボタンなどのインタラクティブ要素の上なら無視
            if (target instanceof Element && target.closest('button, a, input, [role="button"]')) return;

            // ステート更新
            setOrigin({ x: clientX, y: clientY });
            setCurrent({ x: clientX, y: clientY });
            setActive(true);
            
            // 入力リセット
            onInput({ up: false, down: false, left: false, right: false, vector: { x: 0, y: 0 } });
        };

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

        const onMouseDown = (e: MouseEvent) => handleStart(e.clientX, e.clientY, e.target);
        const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const onMouseUp = () => handleEnd();

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length > 1) return;
            handleStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
        };
        const onTouchMove = (e: TouchEvent) => {
            const { active } = stateRef.current;
            if (active) {
                // ゲーム操作中のスクロール防止（必要に応じて）
                // e.preventDefault(); 
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };
        const onTouchEnd = (e: TouchEvent) => handleEnd();

        // window全体でイベントを監視
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        
        const touchOpts = { passive: false }; // スクロール制御のためにpassive: falseにする場合がある
        window.addEventListener('touchstart', onTouchStart, touchOpts as any);
        window.addEventListener('touchmove', onTouchMove, touchOpts as any);
        window.addEventListener('touchend', onTouchEnd);

        return () => {
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, []); // 依存配列は空にし、StateRefを使用

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
        
        // style属性のtransformはクラス指定のtransformを上書きするため、
        // センタリング用の -50% translate をここで明示的に含める
        return { transform: `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0)` };
    };

    return (
        <div ref={containerRef} className="relative w-full h-full select-none">
            {/* 待機中のガイド表示（元のエリアに残す） */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${active ? 'opacity-30' : 'opacity-100'}`}>
                 <div className="flex flex-col items-center pointer-events-none">
                    {/* ガイド用の外枠 */}
                    <div className="w-24 h-24 rounded-full border border-white/10 bg-white/5 flex items-center justify-center relative">
                        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center animate-pulse">
                            <div className="w-2 h-2 bg-cyan-400/30 rounded-full"></div>
                        </div>
                    </div>
                    <span className="mt-2 text-[10px] md:text-xs text-cyan-500/40 font-mono tracking-widest uppercase text-center">
                        Swipe Anywhere<br/>to Thrust
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
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-cyan-500/30 bg-cyan-500/10 backdrop-blur-xs shadow-[0_0_15px_rgba(6,182,212,0.2)]"></div>
                    {/* 動くスティック */}
                    <div 
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-cyan-400/50 backdrop-blur-xs shadow-[0_0_20px_rgba(34,211,238,0.6)]"
                        style={getStickStyle()}
                    ></div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default VirtualJoystick;