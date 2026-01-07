import React, { useRef, useState } from 'react';
import { InputState } from '../types';

interface VirtualJoystickProps {
    onInput: (input: InputState) => void;
}

const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onInput }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const stickRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);
    const [origin, setOrigin] = useState({ x: 0, y: 0 }); // Screen coordinates relative to container
    
    // Configuration
    const maxRadius = 40; 
    const deadZone = 5;

    // Helper to update DOM directly for performance
    const updateStick = (x: number, y: number) => {
        if (stickRef.current) {
            stickRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        }
    };

    const handleStart = (clientX: number, clientY: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        
        // Set origin relative to the container
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        setOrigin({ x, y });
        setActive(true);
        
        // Reset stick position visually
        updateStick(0, 0);
        
        // Reset input on new touch
        onInput({ up: false, down: false, left: false, right: false, vector: { x: 0, y: 0 } });
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!active || !containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const currentX = clientX - rect.left;
        const currentY = clientY - rect.top;

        const dx = currentX - origin.x;
        const dy = currentY - origin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Limit the stick movement to maxRadius
        let clampedX = dx;
        let clampedY = dy;
        
        if (distance > maxRadius) {
            const angle = Math.atan2(dy, dx);
            clampedX = Math.cos(angle) * maxRadius;
            clampedY = Math.sin(angle) * maxRadius;
        }

        // Direct DOM update to avoid React render cycle lag
        updateStick(clampedX, clampedY);

        // Calculate analog vector input (-1.0 to 1.0)
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
            vector: { x: vectorX * maxRadius, y: vectorY * maxRadius} // Pass raw vector for engine scaling
        });
    };

    const handleEnd = () => {
        setActive(false);
        updateStick(0, 0);
        onInput({ up: false, down: false, left: false, right: false, vector: { x: 0, y: 0 } });
    };

    // Mouse Events
    const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
    const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();
    const onMouseLeave = () => handleEnd();

    // Touch Events
    const onTouchStart = (e: React.TouchEvent) => {
        // e.preventDefault(); // Prevented by CSS touch-action usually
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: React.TouchEvent) => {
        // e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        // e.preventDefault();
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
            {/* Simple Idle Guide */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none ${active ? 'opacity-0' : 'opacity-100'}`}>
                 <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center animate-pulse">
                        <div className="w-2 h-2 bg-cyan-400/50 rounded-full"></div>
                    </div>
                    <span className="mt-2 text-[15px] text-cyan-500/60 font-mono tracking-widest uppercase">Swipe to Thrust!</span>
                 </div>
            </div>

            {/* Lightweight Joystick Visuals */}
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
                {/* Simple Ring Base */}
                <div className="w-24 h-24 rounded-full border border-cyan-500/30 bg-black/40 flex items-center justify-center relative shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                    {/* Stick */}
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